// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadEnvConfig } = require('@next/env');

type SeedUser = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'doctor' | 'patient' | 'reception';
  specialization?: string;
  isAvailable?: boolean;
};

const SAMPLE_PASSWORD = 'password123';

const sampleUsers: SeedUser[] = [
  {
    name: 'Reception Staff',
    email: 'reception@hospital.com',
    password: SAMPLE_PASSWORD,
    role: 'reception',
  },
  {
    name: 'Dr Priya Sharma',
    email: 'doctor1@hospital.com',
    password: SAMPLE_PASSWORD,
    role: 'doctor',
    specialization: 'General Medicine',
    isAvailable: true,
  },
  {
    name: 'Dr Rohan Mehta',
    email: 'doctor2@hospital.com',
    password: SAMPLE_PASSWORD,
    role: 'doctor',
    specialization: 'Cardiology',
    isAvailable: true,
  },
  {
    name: 'Aarav Singh',
    email: 'patient1@hospital.com',
    phone: '9000000001',
    password: SAMPLE_PASSWORD,
    role: 'patient',
  },
  {
    name: 'Meera Kapoor',
    email: 'patient2@hospital.com',
    phone: '9000000002',
    password: SAMPLE_PASSWORD,
    role: 'patient',
  },
  {
    name: 'Kavya Nair',
    email: 'patient3@hospital.com',
    phone: '9000000003',
    password: SAMPLE_PASSWORD,
    role: 'patient',
  },
];

async function run() {
  loadEnvConfig(process.cwd());

  const [{ default: connectDB }, { default: User }, { default: Token }, { default: Consultation }, { default: SupportTicket }] = await Promise.all([
    import('../lib/db'),
    import('../models/User'),
    import('../models/Token'),
    import('../models/Consultation'),
    import('../models/SupportTicket'),
  ]);

  await connectDB();

  await Promise.all([
    Token.deleteMany({}),
    Consultation.deleteMany({}),
    SupportTicket.deleteMany({}),
    User.deleteMany({}),
  ]);

  const usersToInsert = await Promise.all(
    sampleUsers.map(async (user) => ({
      ...user,
      password: await bcrypt.hash(user.password, 12),
    }))
  );

  await User.insertMany(usersToInsert, { ordered: true });

  const doctors = sampleUsers.filter((u) => u.role === 'doctor').length;
  const patients = sampleUsers.filter((u) => u.role === 'patient').length;
  const reception = sampleUsers.filter((u) => u.role === 'reception').length;

  console.log('Database reset and sample users created successfully.');
  console.log(`Created: ${doctors} doctors, ${patients} patients, ${reception} receptionist.`);
  console.log('');
  console.log('Staff logins (email + password):');
  console.log('reception@hospital.com / password123');
  console.log('doctor1@hospital.com / password123');
  console.log('doctor2@hospital.com / password123');
  console.log('');
  console.log('Patient logins (phone + password):');
  console.log('9000000001 / password123');
  console.log('9000000002 / password123');
  console.log('9000000003 / password123');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to reset/seed database:', message);
    process.exit(1);
  });
