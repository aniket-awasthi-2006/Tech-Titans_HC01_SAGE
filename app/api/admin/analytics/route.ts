import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Token from '@/models/Token';
import Consultation from '@/models/Consultation';
import { getAdminFromRequest } from '@/lib/auth';

function buildLast7Days() {
  return Array.from({ length: 7 }, (_, index) => format(subDays(new Date(), 6 - index), 'yyyy-MM-dd'));
}

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const today = format(new Date(), 'yyyy-MM-dd');
    const last7Days = buildLast7Days();

    const [
      doctorsCount,
      receptionCount,
      patientsCount,
      tokenStatusToday,
      consultationToday,
      topDoctors,
      genderDistribution,
      dailyVisits,
    ] = await Promise.all([
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'reception' }),
      User.countDocuments({ role: 'patient' }),
      Token.aggregate([
        { $match: { date: today } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Consultation.aggregate([
        { $match: { date: today } },
        {
          $group: {
            _id: null,
            consultationsToday: { $sum: 1 },
            averageDuration: { $avg: '$duration' },
          },
        },
      ]),
      Consultation.aggregate([
        { $match: { date: today } },
        {
          $group: {
            _id: '$doctorId',
            doctorName: { $first: '$doctorName' },
            completedCount: { $sum: 1 },
          },
        },
        { $sort: { completedCount: -1 } },
        { $limit: 5 },
      ]),
      Token.aggregate([
        { $match: { date: today } },
        {
          $group: {
            _id: '$patientGender',
            count: { $sum: 1 },
          },
        },
      ]),
      Token.aggregate([
        { $match: { date: { $in: last7Days } } },
        {
          $group: {
            _id: '$date',
            totalVisits: { $sum: 1 },
            uniquePatients: { $addToSet: { $ifNull: ['$bookedById', '$patientPhone'] } },
          },
        },
        {
          $project: {
            _id: 1,
            totalVisits: 1,
            uniquePatients: { $size: '$uniquePatients' },
          },
        },
      ]),
    ]);

    const tokenStatusMap = tokenStatusToday.reduce<Record<string, number>>((acc, item) => {
      acc[String(item._id)] = Number(item.count || 0);
      return acc;
    }, {});

    const consultationSummary = consultationToday[0] || {};
    const visitsByDay = dailyVisits.reduce<Record<string, { totalVisits: number; uniquePatients: number }>>(
      (acc, item) => {
        acc[String(item._id)] = {
          totalVisits: Number(item.totalVisits || 0),
          uniquePatients: Number(item.uniquePatients || 0),
        };
        return acc;
      },
      {}
    );

    const last7DaySeries = last7Days.map((date) => ({
      date,
      totalVisits: visitsByDay[date]?.totalVisits || 0,
      uniquePatients: visitsByDay[date]?.uniquePatients || 0,
    }));

    return NextResponse.json(
      {
        summary: {
          doctorsCount,
          receptionCount,
          patientsCount,
          totalTokensToday:
            (tokenStatusMap.waiting || 0) +
            (tokenStatusMap['in-progress'] || 0) +
            (tokenStatusMap.done || 0) +
            (tokenStatusMap.cancelled || 0),
          waitingNow: tokenStatusMap.waiting || 0,
          inProgressNow: tokenStatusMap['in-progress'] || 0,
          completedToday: tokenStatusMap.done || 0,
          cancelledToday: tokenStatusMap.cancelled || 0,
          consultationsToday: Number(consultationSummary.consultationsToday || 0),
          averageConsultationMinutes: Math.round(Number(consultationSummary.averageDuration || 0)),
        },
        topDoctors: topDoctors.map((item) => ({
          doctorId: String(item._id),
          doctorName: String(item.doctorName || 'Unknown'),
          completedCount: Number(item.completedCount || 0),
        })),
        genderDistribution: genderDistribution.map((item) => ({
          gender: String(item._id || 'other'),
          count: Number(item.count || 0),
        })),
        last7Days: last7DaySeries,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[Admin Analytics GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
