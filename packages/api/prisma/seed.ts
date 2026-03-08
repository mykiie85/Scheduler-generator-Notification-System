import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Management Users (only these users have access to the app) ──
  const adminHash = await bcrypt.hash('LabScheduler2026!', 12);

  const managementUsers = [
    {
      fileNo: 'FRP-6897',
      email: 'mykiie85@gmail.com',
      fullName: 'Mike Levison Sanga',
      phone: '0687729501',
      title: 'Admin',
      role: 'ADMIN' as const,
    },
    {
      fileNo: 'FRP-1083',
      email: 'njamas49@gmail.com',
      fullName: 'Shauri Ramadhani Njama',
      phone: '0654312619',
      title: 'Laboratory Manager',
      role: 'MANAGER' as const,
    },
    {
      fileNo: 'FRP-0029',
      email: 'jullyelly@yahoo.com',
      fullName: 'Julius Elias Kissinga',
      phone: '0713755628',
      title: 'Quality Officer',
      role: 'MANAGER' as const,
    },
    {
      fileNo: 'FRP-6665',
      email: 'omarychuri02@gmail.com',
      fullName: 'Omari Ramadhani',
      phone: '0762872253',
      title: 'Deputy Manager',
      role: 'MANAGER' as const,
    },
    {
      fileNo: 'FRP-368',
      email: 'ekinalachristopha@gmail.com',
      fullName: 'Ekinala Christopher Mwasamanyambi',
      phone: '0717012085',
      title: 'Deputy Manager',
      role: 'MANAGER' as const,
    },
    {
      fileNo: 'FRP-0755',
      email: 'neemanestory112@gmail.com',
      fullName: 'Neema Nestory Mrema',
      phone: '0657266566',
      title: 'Safety Officer',
      role: 'MANAGER' as const,
    },
  ];

  for (const u of managementUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, phone: u.phone, title: u.title, fileNo: u.fileNo, passwordHash: adminHash, approvalStatus: 'APPROVED' },
      create: {
        fileNo: u.fileNo,
        email: u.email,
        passwordHash: adminHash,
        fullName: u.fullName,
        phone: u.phone,
        title: u.title,
        role: u.role,
        approvalStatus: 'APPROVED',
      },
    });
  }

  // Clean up old backward-compat user
  await prisma.user.deleteMany({ where: { email: 'mike.sanga@lab.go.tz' } });

  console.log('Management users seeded (6 users).');

  // ── 33 Real Staff Members (from staff_db + excel_code_mapping) ──
  type StaffSeed = {
    fileNo: string;
    shortCode: string;
    staffFrpId: string;
    fullName: string;
    initials: string | null;
    staffRole: string | null;
    staffTitle: string | null;
    category: 'LAB_SCIENTIST' | 'LAB_TECHNOLOGIST' | 'LAB_ATTENDANT' | 'ATTENDANT';
    primarySection: string;
    employmentType: string;
    phone: string | null;
    email: string | null;
  };

  const staffData: StaffSeed[] = [
    // 1. NJAM
    { fileNo: 'FRP 1083', shortCode: 'NJAM', staffFrpId: 'FRP 1083', fullName: 'Shauri Ramadhani Njama', initials: 'SRN', staffRole: 'lab manager', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Management', employmentType: 'Permanent', phone: '654312619', email: 'njamas49@gmail.com' },
    // 2. EKI
    { fileNo: 'FRP 368', shortCode: 'EKI', staffFrpId: 'FRP 368', fullName: 'Ekinala Christopher Mwasamanyambi', initials: 'ECM', staffRole: 'deputy lab manager', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'Management', employmentType: 'Permanent', phone: '717012085', email: 'ekinalachristopha@gmail.com' },
    // 3. KIS
    { fileNo: 'FRP 0029', shortCode: 'KIS', staffFrpId: 'FRP 0029', fullName: 'Julius Elias Kissinga', initials: 'JEK', staffRole: 'Quality officer', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Quality', employmentType: 'Permanent', phone: '713755628', email: 'jullyelly@yahoo.com' },
    // 4. LOV
    { fileNo: 'FRP 1061', shortCode: 'LOV', staffFrpId: 'FRP 1061', fullName: 'Loveness Abdallah Sonda', initials: 'LAS', staffRole: 'deputy hematology & blood transfusion', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Hematology', employmentType: 'Permanent', phone: '715395144', email: 'sondalv30@yahoo.com' },
    // 5. CATH
    { fileNo: 'FRP 3599', shortCode: 'CATH', staffFrpId: 'FRP 3599', fullName: 'Catherine Emily Mmari', initials: 'CEM', staffRole: 'head of Tuberculosis & leprosy', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'TB & Leprosy', employmentType: 'Permanent', phone: '717424681', email: 'mmaricatyj@gmail.com' },
    // 6. SANG
    { fileNo: 'FRP 2010', shortCode: 'SANG', staffFrpId: 'FRP 2010', fullName: 'Katawa Obeid Sanga', initials: 'KOS', staffRole: 'deputy head of chemistry', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'Chemistry', employmentType: 'Permanent', phone: '714053706', email: 'elishaobed412@gmail.com' },
    // 7. GOD
    { fileNo: 'FRP 1213', shortCode: 'GOD', staffFrpId: 'FRP 1213', fullName: 'Godfrey Kenneth Mhoga', initials: 'GKM', staffRole: 'head of chemistry', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Chemistry', employmentType: 'Permanent', phone: '717307632', email: 'mhogagodfrey@gmail.com' },
    // 8. JOHA
    { fileNo: 'FRP 1239', shortCode: 'JOHA', staffFrpId: 'FRP 1239', fullName: 'Joha Nuru Juma', initials: 'JNJ', staffRole: 'head of microbiology', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'Microbiology', employmentType: 'Permanent', phone: '715075309', email: 'nurujoha@gmail.com' },
    // 9. KHAD
    { fileNo: 'FRP 5468', shortCode: 'KHAD', staffFrpId: 'FRP 5468', fullName: 'Khadija Seif Issa', initials: 'KSI', staffRole: 'deputy store officer', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Store', employmentType: 'Volunteer', phone: '715454617', email: 'huwaydaseif@gmail.com' },
    // 10. NEEM
    { fileNo: 'FRP 0755', shortCode: 'NEEM', staffFrpId: 'FRP 0755', fullName: 'Neema Nestory Mrema', initials: 'NNM', staffRole: 'safety officer', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'Safety', employmentType: 'Permanent', phone: '657266566', email: 'neemanestory112@gmail.com' },
    // 11. MIK
    { fileNo: 'FRP 6897', shortCode: 'MIK', staffFrpId: 'FRP 6897', fullName: 'Mike Levison Sanga', initials: 'MLS', staffRole: 'deputy quality officer', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'Quality', employmentType: 'Volunteer', phone: '687729501', email: 'Mykiie85@gmail.com' },
    // 12. MAR
    { fileNo: 'FRP 5506', shortCode: 'MAR', staffFrpId: 'FRP 5506', fullName: 'Mariam Charles Lazaro', initials: 'MCL', staffRole: 'head of phlebotomy', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Phlebotomy', employmentType: 'Permanent', phone: '763750667', email: 'Maryamlcharlzy@gmail.com' },
    // 13. CELI
    { fileNo: 'FRP 1107', shortCode: 'CELI', staffFrpId: 'FRP 1107', fullName: 'Celine Abel Massawe', initials: 'CAM', staffRole: 'head of parasitology', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Parasitology', employmentType: 'Permanent', phone: '769314413', email: 'abelceline@yahoo.com' },
    // 14. NYAKUNGA
    { fileNo: 'FRP 5318', shortCode: 'NYAKUNGA', staffFrpId: 'FRP 5318', fullName: 'Lilian Festo Nyakunga', initials: 'LFN', staffRole: 'head of serology and immunology', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Serology', employmentType: 'Permanent', phone: '0693408352', email: 'liliannyakunga24@gmail.com' },
    // 15. TEKEL
    { fileNo: 'FRP 3764', shortCode: 'TEKEL', staffFrpId: 'FRP 3764', fullName: 'Elphace Amon Tekela', initials: 'EAT', staffRole: 'head of store department', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Store', employmentType: 'Permanent', phone: '620584024', email: 'elphacet@gmail.com' },
    // 16. KATU
    { fileNo: 'NA-KATU', shortCode: 'KATU', staffFrpId: 'NA', fullName: 'Mary James Katungutu', initials: 'MJK', staffRole: 'tuberculosis and leprosy staff', staffTitle: 'Lab Attendant', category: 'LAB_ATTENDANT', primarySection: 'TB & Leprosy', employmentType: 'Permanent', phone: '714072568', email: 'Mary.katungutu@afya.go.tz' },
    // 17. MAY
    { fileNo: 'FRP 5706', shortCode: 'MAY', staffFrpId: 'FRP 5706', fullName: 'Mwajuma Amry Zullu', initials: 'MAZ', staffRole: 'chemistry staff', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Chemistry', employmentType: 'Permanent', phone: '625937318', email: 'Zullumay0@gmail.com' },
    // 18. FRANK
    { fileNo: 'FRP 7570', shortCode: 'FRANK', staffFrpId: 'FRP 7570', fullName: 'Frank Lucas Maiseli', initials: 'FLM', staffRole: 'phlebotomy staff', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Phlebotomy', employmentType: 'Permanent', phone: '686702583', email: 'Frankmaselo5@gmail.com' },
    // 19. OMAR
    { fileNo: 'FRP 6665', shortCode: 'OMAR', staffFrpId: 'FRP 6665', fullName: 'Omari Ramadhan Churi', initials: 'ORC', staffRole: 'deputy quality officer', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Quality', employmentType: 'Permanent', phone: '762872253', email: 'omarychuri02@gmail.com' },
    // 20. SALOM
    { fileNo: 'FRP 8950', shortCode: 'SALOM', staffFrpId: 'FRP 8950', fullName: 'Salome Deusdedit Mkwawe', initials: 'SDM', staffRole: 'deputy head of TB & leprosy', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'TB & Leprosy', employmentType: 'Permanent', phone: '747807737', email: 'salomekalonga@gmail.com' },
    // 21. VALENT
    { fileNo: 'FRP 8360', shortCode: 'VALENT', staffFrpId: 'FRP 8360', fullName: 'Valentina Opilius Sanga', initials: 'VOS', staffRole: 'deputy phlebotomy', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Phlebotomy', employmentType: 'Permanent', phone: '710476112', email: 'Valentinesanga41@gmail.com' },
    // 22. AGRIPIN
    { fileNo: 'NA-AGRIPIN', shortCode: 'AGRIPIN', staffFrpId: 'NA', fullName: 'Agrippina Julius France', initials: 'AJF', staffRole: 'phlebotomy staff', staffTitle: 'Lab Attendant', category: 'LAB_ATTENDANT', primarySection: 'Phlebotomy', employmentType: 'Permanent', phone: '689500935', email: 'Agry.france91@gmail.com' },
    // 23. JISKAKA
    { fileNo: 'FRP 4550', shortCode: 'JISKAKA', staffFrpId: 'FRP 4550', fullName: 'Filbert D Jiskaka', initials: 'FDJ', staffRole: 'emergency laboratory staff', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'Emergency Lab', employmentType: 'Volunteer', phone: '719845514', email: 'jiskakafilbert@gmail.com' },
    // 24. YSUPH
    { fileNo: 'FRP 10638', shortCode: 'YSUPH', staffFrpId: 'FRP 10638', fullName: 'Yusuph Hassan Lupinda', initials: 'YHR', staffRole: 'emergency laboratory staff', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'Emergency Lab', employmentType: 'Volunteer', phone: '0783050927', email: '89rupinda@gmail.com' },
    // 25. DATUS
    { fileNo: 'FRP 4494', shortCode: 'DATUS', staffFrpId: 'FRP 4494', fullName: 'Datus Tumwesige Celestini', initials: 'DTC', staffRole: 'chemistry staff', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Chemistry', employmentType: 'Permanent', phone: '755527676', email: 'celestinidatius@gmail.com' },
    // 26. HAPPY
    { fileNo: 'FRP 4980', shortCode: 'HAPPY', staffFrpId: 'FRP 4980', fullName: 'Happyfania James Bakunda', initials: 'HJB', staffRole: 'chemistry staff', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'Chemistry', employmentType: 'Permanent', phone: '743263760', email: 'happybakunda@icloud.com' },
    // 27. BERTHA
    { fileNo: 'FRP 1319', shortCode: 'BERTHA', staffFrpId: 'FRP 1319', fullName: 'Bertha Luther Mwamkoa', initials: 'BLM', staffRole: 'deputy head of phlebotomy', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'Phlebotomy', employmentType: 'Permanent', phone: '713575568', email: 'lutherbertha@gmail.com' },
    // 28. ASMA
    { fileNo: 'NA-ASMA', shortCode: 'ASMA', staffFrpId: 'NA', fullName: 'Asma Idrisa Kiluwa', initials: null, staffRole: null, staffTitle: null, category: 'LAB_ATTENDANT', primarySection: 'General', employmentType: 'Permanent', phone: null, email: null },
    // 29. JOSEPH
    { fileNo: 'FRP 4066', shortCode: 'JOSEPH', staffFrpId: 'FRP 4066', fullName: 'Joseph Pauline Mhana', initials: 'JPM', staffRole: 'deputy head of TB & leprosy', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'TB & Leprosy', employmentType: 'Permanent', phone: '653523011', email: 'Josephpaulmhane@gmail.com' },
    // 30. JENISTER
    { fileNo: 'FRP 4659', shortCode: 'JENISTER', staffFrpId: 'FRP 4659', fullName: 'Jenister Simon Mrosso', initials: 'JSM', staffRole: 'bima laboratory staff', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'BIMA Lab', employmentType: 'Permanent', phone: '769072164', email: 'Jenistermrosso1@gmail.com' },
    // 31. DOREEN
    { fileNo: 'FRP 4054', shortCode: 'DOREEN', staffFrpId: 'FRP 4054', fullName: 'Doreen Damas Massawe', initials: 'DDM', staffRole: 'hematology staff', staffTitle: 'Lab Technologist', category: 'LAB_TECHNOLOGIST', primarySection: 'Hematology', employmentType: 'Permanent', phone: '623871749', email: 'Doreendamas18@gmail.com' },
    // 32. SHUW
    { fileNo: 'FRP 6115', shortCode: 'SHUW', staffFrpId: 'FRP 6115', fullName: 'Shuweikha Mohammed Ally', initials: 'SMA', staffRole: 'phlebotomy staff', staffTitle: 'Lab Scientist', category: 'LAB_SCIENTIST', primarySection: 'Phlebotomy', employmentType: 'Permanent', phone: '622484912', email: 'shuweikhamohd@gmail.com' },
    // 33. PAUL
    { fileNo: 'ERP 4744', shortCode: 'PAUL', staffFrpId: 'ERP 4744', fullName: 'Paulo Marungwe Dagano', initials: 'PMD', staffRole: 'bima laboratory staff', staffTitle: 'Assistant Lab Technologist', category: 'ATTENDANT', primarySection: 'BIMA Lab', employmentType: 'Volunteer', phone: '621740443', email: 'Paulmarugwe00@gmail.com' },
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
        'Perform Complete Blood Count (CBC) analysis',
        'Prepare and examine peripheral blood smears',
        'Perform ESR, coagulation tests (PT, APTT)',
        'Verify and validate analyzer results before release',
        'Perform daily internal quality control (IQC)',
        'Participate in External Quality Assessment (EQA)',
        'Maintain hematology analyzers and document maintenance',
        'Flag critical values and notify clinicians immediately',
        'Ensure proper sample rejection criteria are followed',
        'Maintain section temperature and reagent storage conditions',
        'Perform ABO and Rh blood grouping',
        'Conduct crossmatching before transfusion',
        'Screen for transfusion-transmissible infections (TTIs)',
        'Maintain blood unit inventory',
        'Monitor blood bank refrigerator temperatures',
      ],
      responsibilities: [
        'Document all QC failures and corrective actions',
        'Ensure turnaround time (TAT) compliance',
        'Maintain reagent lot traceability',
        'Participate in method verification/validation when required',
      ],
      minStaffPerShift: 2,
    },
    {
      sectionName: 'Chemistry',
      duties: [
        'Run routine chemistry tests (U&E, LFT, RFT, Lipid profile, Glucose)',
        'Calibrate analyzers when required',
        'Perform daily IQC and review Levy-Jennings charts',
        'Verify abnormal/critical values before release',
        'Perform reagent inventory monitoring',
        'Maintain proper storage (2–8°C / RT conditions)',
        'Ensure proper sample centrifugation and separation',
      ],
      responsibilities: [
        'Monitor Westgard rules',
        'Document corrective actions for QC failures',
        'Maintain calibration records',
        'Ensure analyzer downtime is recorded and reported',
      ],
      minStaffPerShift: 2,
    },
    {
      sectionName: 'Microbiology',
      duties: [
        'Receive and process specimens (urine, stool, blood culture, swabs)',
        'Perform Gram staining',
        'Culture and incubate specimens',
        'Perform identification tests',
        'Conduct antibiotic susceptibility testing (AST)',
        'Maintain incubator temperature logs',
        'Dispose biohazard waste correctly',
      ],
      responsibilities: [
        'Maintain culture media quality checks',
        'Ensure sterility testing records',
        'Verify AST interpretation using CLSI guidelines',
        'Notify critical organisms immediately',
      ],
      minStaffPerShift: 2,
    },
    {
      sectionName: 'Serology',
      duties: [
        'Perform ELISA tests (HIV, Hepatitis, Syphilis)',
        'Run rapid diagnostic tests (RDTs)',
        'Ensure proper incubation timing',
        'Perform daily positive and negative controls',
        'Maintain cold chain for reagents',
      ],
      responsibilities: [
        'Maintain kit lot tracking',
        'Ensure documentation of control results',
        'Verify reactive results before reporting',
        'Participate in proficiency testing',
      ],
      minStaffPerShift: 1,
    },
    {
      sectionName: 'Phlebotomy',
      duties: [
        'Perform venipuncture and capillary collection',
        'Ensure correct patient identification',
        'Label specimens immediately',
        'Apply correct tube selection',
        'Maintain phlebotomy area cleanliness',
        'Record collection time',
        'Follow infection prevention procedures',
      ],
      responsibilities: [
        'Monitor sample rejection rates',
        'Document adverse events',
        'Ensure PPE compliance',
      ],
      minStaffPerShift: 2,
    },
    {
      sectionName: 'Reception/LIS',
      duties: [
        'Register patients in LIS',
        'Verify test requests',
        'Print and dispatch reports',
        'Maintain confidentiality',
        'Manage billing records',
        'Handle customer complaints professionally',
      ],
      responsibilities: [
        'Ensure patient data protection',
        'Maintain document control procedures',
        'Log and escalate complaints',
      ],
      minStaffPerShift: 1,
    },
    {
      sectionName: 'TB & Leprosy',
      duties: [
        'Receive and verify sputum or clinical specimens for TB or suspected leprosy testing',
        'Perform AFB smear microscopy using Ziehl-Neelsen (ZN) or fluorescent staining techniques',
        'Prepare and examine smears under microscope to detect Acid-Fast Bacilli (AFB)',
        'Run GeneXpert MTB/RIF or MTB/RIF Ultra tests for rapid detection of Mycobacterium tuberculosis and Rifampicin resistance',
        'Ensure correct cartridge handling and loading into the GeneXpert instrument',
        'Monitor GeneXpert module status and machine performance',
        'Record and verify AFB grading results (Negative, Scanty, 1+, 2+, 3+) before reporting',
        'Maintain proper biosafety procedures when handling infectious specimens',
        'Notify clinicians immediately when MTB detected or Rifampicin resistance is detected',
      ],
      responsibilities: [
        'Perform daily instrument checks and module verification for the GeneXpert system',
        'Maintain temperature logs for cartridge storage (2-28°C) according to manufacturer instructions',
        'Document internal controls and error codes from GeneXpert runs',
        'Maintain smear microscopy quality control slides (positive and negative controls)',
        'Ensure traceability of specimen, cartridge lot numbers, and test results',
        'Record turnaround time (TAT) and ensure timely reporting',
        'Participate in External Quality Assessment (EQA) programs for TB microscopy and molecular testing',
      ],
      minStaffPerShift: 1,
    },
    {
      sectionName: 'Parasitology',
      duties: [
        'Prepare and examine thick and thin blood smears for malaria parasites',
        'Perform stool microscopy for ova, cysts, and parasites',
        'Conduct urine microscopy for Schistosoma and other parasites',
        'Run malaria rapid diagnostic tests (RDTs)',
        'Grade and quantify parasite density on blood smears',
        'Perform concentration techniques for stool specimens',
        'Maintain proper staining solutions (Giemsa, Field stain)',
      ],
      responsibilities: [
        'Maintain microscope calibration and cleaning logs',
        'Perform daily quality control using known positive/negative slides',
        'Ensure species identification accuracy and double-check positive results',
        'Participate in EQA programs for parasitology',
        'Document turnaround time (TAT) compliance',
      ],
      minStaffPerShift: 1,
    },
    {
      sectionName: 'Store',
      duties: [
        'Receive and verify laboratory reagents, consumables, and supplies from suppliers',
        'Check expiry dates, batch numbers, and quantity of delivered items',
        'Maintain proper storage conditions for reagents (2-8°C or room temperature)',
        'Record inventory in stock registers or LIS inventory system',
        'Monitor minimum and maximum stock levels',
        'Issue reagents and consumables to laboratory sections as required',
        'Ensure First-Expiry-First-Out (FEFO) inventory usage',
        'Maintain clean and organized storage areas',
        'Prepare reagent consumption reports',
      ],
      responsibilities: [
        'Maintain reagent lot traceability records',
        'Document temperature monitoring logs for reagent storage refrigerators',
        'Record incoming and outgoing stock transactions',
        'Ensure expired or damaged reagents are removed and documented',
        'Maintain supplier documentation and delivery records',
      ],
      minStaffPerShift: 1,
    },
    {
      sectionName: 'Emergency Lab',
      duties: [
        'Perform Full Blood Picture (FBP/CBC) analysis for emergency patients',
        'Conduct Malaria Rapid Diagnostic Tests (RDTs) for suspected malaria cases',
        'Perform Random Blood Glucose (RBG) testing using glucometer or analyzer',
        'Run Blood Gas Analysis for critically ill patients',
        'Ensure proper patient identification and labeling before testing',
        'Verify and validate critical results before release',
        'Immediately notify clinicians for life-threatening results',
        'Maintain rapid turnaround time (TAT) for emergency cases',
        'Maintain clean and organized emergency testing area',
      ],
      responsibilities: [
        'Perform daily internal quality control (IQC) for analyzers and point-of-care devices',
        'Maintain equipment maintenance and calibration logs',
        'Document QC failures and corrective actions',
        'Ensure reagent storage conditions are monitored',
        'Maintain traceability of patient samples and results',
        'Record turnaround times for emergency tests',
      ],
      minStaffPerShift: 1,
    },
    {
      sectionName: 'BIMA Lab',
      duties: [
        'Perform patient registration and sample collection',
        'Conduct venipuncture and capillary blood collection',
        'Ensure correct patient identification before sample collection',
        'Label specimens immediately after collection',
        'Ensure correct tube selection and order of draw',
        'Prepare specimens for transport to the main laboratory',
        'Maintain proper sample storage conditions before transport',
        'Ensure safe packaging of specimens for transportation',
        'Maintain clean and organized sample collection area',
      ],
      responsibilities: [
        'Maintain sample rejection records',
        'Ensure traceability of samples from collection to testing',
        'Maintain proper documentation of specimen transport times',
        'Follow infection prevention and control procedures',
        'Ensure PPE compliance during sample collection',
      ],
      minStaffPerShift: 1,
    },
    {
      sectionName: 'Management',
      duties: [
        'Supervise daily laboratory operations across all sections',
        'Ensure staff allocation and duty roster management',
        'Monitor laboratory performance indicators',
        'Review and approve laboratory reports and critical results',
        'Handle staff coordination and conflict resolution',
        'Ensure proper communication with clinicians and hospital administration',
        'Monitor equipment functionality and service requirements',
        'Conduct laboratory meetings and staff briefings',
      ],
      responsibilities: [
        'Ensure compliance with laboratory quality management system (QMS)',
        'Monitor internal quality control (IQC) and external quality assessment (EQA)',
        'Review non-conformities and corrective actions',
        'Ensure document control and SOP compliance',
        'Conduct internal audits and quality improvement activities',
        'Monitor turnaround time (TAT) performance',
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

  // ── Annual Leave 2026 (real dates from leave_db) ──
  const allStaff = await prisma.staff.findMany();
  const leaveData: Array<{ shortCode: string; start: string; end: string; reason: string }> = [
    { shortCode: 'LOV', start: '2026-05-22', end: '2026-06-19', reason: 'Annual leave' },
    { shortCode: 'OMAR', start: '2026-10-19', end: '2026-11-16', reason: 'Annual leave' },
    { shortCode: 'EKI', start: '2026-11-30', end: '2026-12-28', reason: 'Annual leave' },
    { shortCode: 'KIS', start: '2026-11-16', end: '2026-12-14', reason: 'Annual leave' },
    { shortCode: 'JOHA', start: '2026-12-20', end: '2027-01-18', reason: 'Annual leave' },
    { shortCode: 'SANG', start: '2026-04-09', end: '2026-05-07', reason: 'Annual leave' },
    { shortCode: 'NEEM', start: '2026-06-12', end: '2026-07-10', reason: 'Annual leave' },
    { shortCode: 'CATH', start: '2026-12-14', end: '2027-01-10', reason: 'Annual leave' },
    { shortCode: 'SALOM', start: '2026-12-15', end: '2027-01-11', reason: 'Annual leave' },
    { shortCode: 'CELI', start: '2026-12-14', end: '2027-01-10', reason: 'Annual leave' },
    { shortCode: 'GOD', start: '2026-11-23', end: '2026-12-21', reason: 'Annual leave' },
    { shortCode: 'TEKEL', start: '2026-12-10', end: '2027-01-08', reason: 'Annual leave' },
    { shortCode: 'VALENT', start: '2026-04-06', end: '2026-05-04', reason: 'Annual leave' },
    { shortCode: 'FRANK', start: '2026-09-20', end: '2026-10-20', reason: 'Annual leave' },
    { shortCode: 'MAY', start: '2026-12-21', end: '2027-01-17', reason: 'Annual leave' },
    { shortCode: 'KATU', start: '2026-11-09', end: '2026-12-06', reason: 'Annual leave' },
    { shortCode: 'JOSEPH', start: '2026-06-30', end: '2026-07-28', reason: 'Annual leave' },
    { shortCode: 'HAPPY', start: '2026-10-20', end: '2026-11-17', reason: 'Annual leave' },
    { shortCode: 'MAR', start: '2026-12-21', end: '2027-01-17', reason: 'Annual leave' },
    { shortCode: 'DATUS', start: '2026-12-14', end: '2027-01-12', reason: 'Annual leave' },
    { shortCode: 'SHUW', start: '2026-09-10', end: '2026-10-08', reason: 'Annual leave' },
    { shortCode: 'JENISTER', start: '2026-03-30', end: '2026-04-27', reason: 'Annual leave' },
    { shortCode: 'DOREEN', start: '2026-06-28', end: '2026-07-28', reason: 'Annual leave' },
    { shortCode: 'JISKAKA', start: '2026-12-08', end: '2027-07-18', reason: 'Extended leave' },
    { shortCode: 'YSUPH', start: '2026-06-29', end: '2026-07-27', reason: 'Annual leave' },
    { shortCode: 'AGRIPIN', start: '2026-06-29', end: '2026-07-27', reason: 'Annual leave' },
    { shortCode: 'KHAD', start: '2026-08-03', end: '2026-08-31', reason: 'Annual leave' },
    { shortCode: 'MIK', start: '2026-04-13', end: '2026-05-04', reason: 'Annual leave' },
  ];

  for (const leave of leaveData) {
    const staff = allStaff.find((s) => s.shortCode === leave.shortCode);
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
