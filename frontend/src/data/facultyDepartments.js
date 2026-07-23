// Faculty -> Department mapping used to populate the cascading selects
// in the registration form. Extracted verbatim from the original app.js.
export const facultyDeptData = {
  'Faculty of Commerce & Management Studies': [
    'Department of Accountancy',
    'Department of Commerce & Financial Management',
    'Department of Finance',
    'Department of Human Resource Management',
    'Department of Marketing Management',
    'Other'
  ],
  'Faculty of Computing and Technology': [
    'Department of Computer Systems Engineering',
    'Department of Industrial Management Technology',
    'Department of Software Engineering',
    'Other'
  ],
  'Faculty of Humanities': [
    'Department of English',
    'Department of English Language Teaching (DELT)',
    'Department of Fine Arts',
    'Department of Hindi Studies',
    'Department of Linguistics',
    'Department of Modern Languages',
    'Department of Pali & Buddhist Studies',
    'Department of Sanskrit & Eastern Studies',
    'Department of Sinhala',
    'Department of Western Classical Culture & Christian Culture',
    'Other'
  ],
  'Faculty of Medicine': [
    'Department of Anatomy',
    'Department of Biochemistry & Clinical Chemistry',
    'Department of Community Medicine',
    'Department of Family Medicine',
    'Department of Forensic Medicine',
    'Department of Medical Education',
    'Department of Medicine',
    'Department of Medical Microbiology',
    'Department of Obstetrics & Gynaecology',
    'Department of Paediatrics',
    'Department of Parasitology',
    'Department of Pathology',
    'Department of Pharmacology',
    'Department of Physiology',
    'Department of Psychiatry',
    'Department of Public Health',
    'Department of Surgery',
    'Other'
  ],
  'Faculty of Science': [
    'Department of Chemistry',
    'Department of Industrial Management',
    'Department of Mathematics',
    'Department of Microbiology',
    'Department of Physics & Electronics',
    'Department of Plant & Molecular Biology',
    'Department of Statistics & Computer Science',
    'Department of Zoology & Environmental Management',
    'Other'
  ],
  'Faculty of Social Sciences': [
    'Department of Criminology & Criminal Justice',
    'Department of Economics',
    'Department of Geography',
    'Department of History',
    'Department of International Studies',
    'Department of Library & Information Science',
    'Department of Mass Communication',
    'Department of Philosophy',
    'Department of Political Science',
    'Department of Psychology',
    'Department of Social Statistics',
    'Department of Social Work',
    'Department of Sociology',
    'Department of Sport Science & Physical Education',
    'Other'
  ]
};

export const faculties = Object.keys(facultyDeptData);
