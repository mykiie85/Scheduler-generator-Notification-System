import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Admin & Management Users ──
  const adminHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'mike.sanga@lab.go.tz' },
    update: {},
    create: {
      email: 'mike.sanga@lab.go.tz',
      passwordHash: adminHash,
      fullName: 'Mike Levison Sanga',
      role: 'ADMIN',
      approvalStatus: 'APPROVED',
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@lab.go.tz' },
    update: {},
    create: {
      email: 'manager@lab.go.tz',
      passwordHash: adminHash,
      fullName: 'Lab Manager',
      role: 'MANAGER',
      approvalStatus: 'APPROVED',
    },
  });

  console.log('Users seeded.');

  // ── 33 Staff Members ──
  const staffData = [
    { fileNo: 'HQ/001', checkNo: 'CHK001', fullName: 'Mike Levison Sanga', category: 'DEGREE' as const, primarySection: 'Quality', phone: '+255700000001' },
    { fileNo: 'HQ/002', checkNo: 'CHK002', fullName: 'John Peter Mwakasege', category: 'DEGREE' as const, primarySection: 'Hematology', phone: '+255700000002' },
    { fileNo: 'HQ/003', checkNo: 'CHK003', fullName: 'Grace Amos Mushi', category: 'DEGREE' as const, primarySection: 'Chemistry', phone: '+255700000003' },
    { fileNo: 'HQ/004', checkNo: 'CHK004', fullName: 'Emanuel Joseph Massawe', category: 'DEGREE' as const, primarySection: 'Microbiology', phone: '+255700000004' },
    { fileNo: 'HQ/005', checkNo: 'CHK005', fullName: 'Happiness Dismas Mwakalinga', category: 'DEGREE' as const, primarySection: 'Serology', phone: '+255700000005' },
    { fileNo: 'HQ/006', checkNo: 'CHK006', fullName: 'Rehema Said Mtumwa', category: 'DEGREE' as const, primarySection: 'Hematology', phone: '+255700000006' },
    { fileNo: 'HQ/007', checkNo: 'CHK007', fullName: 'Baraka Hosea Kileo', category: 'DEGREE' as const, primarySection: 'Chemistry', phone: '+255700000007' },
    { fileNo: 'HQ/008', checkNo: 'CHK008', fullName: 'Amina Hassan Mwinyimkuu', category: 'DIPLOMA' as const, primarySection: 'Hematology', phone: '+255700000008' },
    { fileNo: 'HQ/009', checkNo: 'CHK009', fullName: 'Joseph Francis Tarimo', category: 'DIPLOMA' as const, primarySection: 'Chemistry', phone: '+255700000009' },
    { fileNo: 'HQ/010', checkNo: 'CHK010', fullName: 'Neema William Shirima', category: 'DIPLOMA' as const, primarySection: 'Microbiology', phone: '+255700000010' },
    { fileNo: 'HQ/011', checkNo: 'CHK011', fullName: 'Zawadi Julius Mfinanga', category: 'DIPLOMA' as const, primarySection: 'Serology', phone: '+255700000011' },
    { fileNo: 'HQ/012', checkNo: 'CHK012', fullName: 'Issa Ramadhani Juma', category: 'DIPLOMA' as const, primarySection: 'Phlebotomy', phone: '+255700000012' },
    { fileNo: 'HQ/013', checkNo: 'CHK013', fullName: 'Fatuma Abdallah Kiondo', category: 'DIPLOMA' as const, primarySection: 'Reception/LIS', phone: '+255700000013' },
    { fileNo: 'HQ/014', checkNo: 'CHK014', fullName: 'Petro Simon Lyimo', category: 'DIPLOMA' as const, primarySection: 'TB', phone: '+255700000014' },
    { fileNo: 'HQ/015', checkNo: 'CHK015', fullName: 'Mary John Kimaro', category: 'DIPLOMA' as const, primarySection: 'Hematology', phone: '+255700000015' },
    { fileNo: 'HQ/016', checkNo: 'CHK016', fullName: 'David Elias Mwangosi', category: 'DIPLOMA' as const, primarySection: 'Chemistry', phone: '+255700000016' },
    { fileNo: 'HQ/017', checkNo: 'CHK017', fullName: 'Agnes Paul Mbwambo', category: 'DIPLOMA' as const, primarySection: 'Microbiology', phone: '+255700000017' },
    { fileNo: 'HQ/018', checkNo: 'CHK018', fullName: 'Salum Omary Mzee', category: 'CERTIFICATE' as const, primarySection: 'Phlebotomy', phone: '+255700000018' },
    { fileNo: 'HQ/019', checkNo: 'CHK019', fullName: 'Rose Thomas Swai', category: 'CERTIFICATE' as const, primarySection: 'Reception/LIS', phone: '+255700000019' },
    { fileNo: 'HQ/020', checkNo: 'CHK020', fullName: 'Hamisi Ally Kitwana', category: 'CERTIFICATE' as const, primarySection: 'Phlebotomy', phone: '+255700000020' },
    { fileNo: 'HQ/021', checkNo: 'CHK021', fullName: 'Stella George Massawe', category: 'CERTIFICATE' as const, primarySection: 'Hematology', phone: '+255700000021' },
    { fileNo: 'HQ/022', checkNo: 'CHK022', fullName: 'Dotto Rashid Mwinyi', category: 'CERTIFICATE' as const, primarySection: 'Chemistry', phone: '+255700000022' },
    { fileNo: 'HQ/023', checkNo: 'CHK023', fullName: 'Joyce Emmanueli Swai', category: 'CERTIFICATE' as const, primarySection: 'Serology', phone: '+255700000023' },
    { fileNo: 'HQ/024', checkNo: 'CHK024', fullName: 'Ramadhani Bakari Mussa', category: 'CERTIFICATE' as const, primarySection: 'TB', phone: '+255700000024' },
    { fileNo: 'HQ/025', checkNo: 'CHK025', fullName: 'Esther Daniel Komba', category: 'CERTIFICATE' as const, primarySection: 'Reception/LIS', phone: '+255700000025' },
    { fileNo: 'HQ/026', checkNo: 'CHK026', fullName: 'Geofrey Simon Mollel', category: 'CERTIFICATE' as const, primarySection: 'Microbiology', phone: '+255700000026' },
    { fileNo: 'HQ/027', checkNo: 'CHK027', fullName: 'Consolata James Mushi', category: 'ATTENDANT' as const, primarySection: 'Hematology', phone: '+255700000027' },
    { fileNo: 'HQ/028', checkNo: 'CHK028', fullName: 'Zuhura Omary Said', category: 'ATTENDANT' as const, primarySection: 'Chemistry', phone: '+255700000028' },
    { fileNo: 'HQ/029', checkNo: 'CHK029', fullName: 'Mwanaisha Juma Bakari', category: 'ATTENDANT' as const, primarySection: 'Microbiology', phone: '+255700000029' },
    { fileNo: 'HQ/030', checkNo: 'CHK030', fullName: 'Saidi Hamisi Selemani', category: 'ATTENDANT' as const, primarySection: 'Serology', phone: '+255700000030' },
    { fileNo: 'HQ/031', checkNo: 'CHK031', fullName: 'Anna Marco Lema', category: 'ATTENDANT' as const, primarySection: 'Phlebotomy', phone: '+255700000031' },
    { fileNo: 'HQ/032', checkNo: 'CHK032', fullName: 'Yusufu Abdallah Ngowi', category: 'ATTENDANT' as const, primarySection: 'Reception/LIS', phone: '+255700000032' },
    { fileNo: 'HQ/033', checkNo: 'CHK033', fullName: 'Mariam Omary Hassan', category: 'ATTENDANT' as const, primarySection: 'TB', phone: '+255700000033' },
  ];

  for (const s of staffData) {
    await prisma.staff.upsert({
      where: { fileNo: s.fileNo },
      update: s,
      create: s,
    });
  }
  console.log(`${staffData.length} staff members seeded.`);

  // ── Section Duties ──
  const sections = [
    {
      sectionName: 'Hematology',
      duties: [
        'Complete Blood Count (CBC)',
        'Blood film preparation and review',
        'ESR determination',
        'Coagulation studies (PT, APTT)',
        'Blood grouping and cross-matching',
        'Peripheral blood smear examination',
        'Reticulocyte count',
      ],
      responsibilities: [
        'Maintain hematology analyzers',
        'Quality control for CBC and coagulation',
        'Blood bank inventory management',
        'Report critical values immediately',
      ],
      minStaffPerShift: 2,
    },
    {
      sectionName: 'Chemistry',
      duties: [
        'Liver function tests (LFTs)',
        'Renal function tests (RFTs)',
        'Lipid profile',
        'Blood glucose (FBS, RBS, OGTT)',
        'Electrolytes (Na, K, Cl)',
        'Cardiac enzymes',
        'Thyroid function tests',
        'HbA1c',
      ],
      responsibilities: [
        'Chemistry analyzer maintenance and calibration',
        'Reagent inventory and quality control',
        'Report critical values immediately',
        'External quality assurance participation',
      ],
      minStaffPerShift: 2,
    },
    {
      sectionName: 'Microbiology',
      duties: [
        'Culture and sensitivity testing',
        'Gram staining',
        'AFB smear microscopy',
        'Urine microscopy and culture',
        'Stool examination',
        'Wound swab culture',
        'Blood culture',
      ],
      responsibilities: [
        'Media preparation and sterilization',
        'Biosafety compliance',
        'Antibiotic susceptibility testing',
        'Infection control reporting',
      ],
      minStaffPerShift: 2,
    },
    {
      sectionName: 'Serology',
      duties: [
        'HIV rapid testing and confirmatory',
        'Hepatitis B and C screening',
        'Syphilis (RPR/VDRL and TPHA)',
        'Brucella testing',
        'Widal test',
        'Rheumatoid factor',
        'ASO titer',
        'CRP',
      ],
      responsibilities: [
        'Quality control for rapid tests',
        'Cold chain maintenance for kits',
        'Testing algorithm compliance',
        'Result confidentiality',
      ],
      minStaffPerShift: 1,
    },
    {
      sectionName: 'Phlebotomy',
      duties: [
        'Venipuncture and capillary blood collection',
        'Sample labeling and identification',
        'Sample transportation to sections',
        'Patient preparation and consent',
      ],
      responsibilities: [
        'Maintain phlebotomy supplies',
        'Ensure proper patient identification',
        'Follow infection prevention protocols',
        'Handle sharps disposal',
      ],
      minStaffPerShift: 2,
    },
    {
      sectionName: 'Reception/LIS',
      duties: [
        'Patient registration',
        'Sample reception and logging',
        'Result entry into LIS',
        'Result printing and dispatch',
        'Phone inquiries handling',
      ],
      responsibilities: [
        'LIS system maintenance',
        'Patient data confidentiality',
        'Sample tracking and TAT monitoring',
        'Filing and archiving',
      ],
      minStaffPerShift: 1,
    },
    {
      sectionName: 'TB',
      duties: [
        'GeneXpert MTB/RIF testing',
        'AFB smear microscopy',
        'TB culture (if applicable)',
        'Drug susceptibility testing coordination',
      ],
      responsibilities: [
        'GeneXpert cartridge inventory',
        'Biosafety cabinet maintenance',
        'NTLP reporting compliance',
        'Sample referral coordination',
      ],
      minStaffPerShift: 1,
    },
  ];

  for (const section of sections) {
    await prisma.sectionDuty.upsert({
      where: { sectionName: section.sectionName },
      update: section,
      create: section,
    });
  }
  console.log(`${sections.length} section duties seeded.`);

  // ── Annual Leave 2026 ──
  const allStaff = await prisma.staff.findMany();
  const leaveData = [
    { fileNo: 'HQ/002', start: '2026-02-01', end: '2026-02-28', reason: 'Annual leave' },
    { fileNo: 'HQ/005', start: '2026-03-15', end: '2026-04-15', reason: 'Annual leave' },
    { fileNo: 'HQ/008', start: '2026-01-10', end: '2026-02-10', reason: 'Annual leave' },
    { fileNo: 'HQ/010', start: '2026-04-01', end: '2026-04-30', reason: 'Annual leave' },
    { fileNo: 'HQ/014', start: '2026-06-01', end: '2026-06-30', reason: 'Annual leave' },
    { fileNo: 'HQ/017', start: '2026-07-15', end: '2026-08-15', reason: 'Annual leave' },
    { fileNo: 'HQ/020', start: '2026-05-01', end: '2026-05-31', reason: 'Annual leave' },
    { fileNo: 'HQ/023', start: '2026-09-01', end: '2026-09-30', reason: 'Annual leave' },
    { fileNo: 'HQ/025', start: '2026-08-01', end: '2026-08-31', reason: 'Annual leave' },
    { fileNo: 'HQ/030', start: '2026-11-01', end: '2026-11-30', reason: 'Annual leave' },
  ];

  for (const leave of leaveData) {
    const staff = allStaff.find((s) => s.fileNo === leave.fileNo);
    if (staff) {
      const existing = await prisma.annualLeave.findFirst({
        where: {
          staffId: staff.id,
          startDate: new Date(leave.start),
        },
      });
      if (!existing) {
        await prisma.annualLeave.create({
          data: {
            staffId: staff.id,
            startDate: new Date(leave.start),
            endDate: new Date(leave.end),
            reason: leave.reason,
            approved: true,
          },
        });
      }
    }
  }
  console.log('Annual leave data seeded.');

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
