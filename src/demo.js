import { withDisplayName, emptyContact } from './contact.js';

// Made-up contacts for demo mode. Nothing here is a real person or number.
const raw = [
  ['Priya (college roommate)', '(201) 555-0101', 'priya.demo@example.com', '', { year: 1998, month: 3, day: 14 }],
  ['Marcus Gym', '(201) 555-0102', '', '', null],
  ['DO NOT ANSWER', '(201) 555-0103', '', '', null],
  ['Aunty Latha', '(201) 555-0104', '', '', { month: 8, day: 2 }],
  ['Jess ?? party', '(201) 555-0105', '', '', null],
  ['Plumber (old apartment)', '(201) 555-0106', '', 'QuickFix Plumbing', null],
  ['Devon Okafor', '(201) 555-0107', 'devon.demo@example.com', 'Tidewater Games', { year: 1995, month: 11, day: 30 }],
  ['', '(201) 555-0108', '', '', null],
  ['Maya’s mom', '(201) 555-0109', '', '', null],
  ['Sam Landlord 2019', '(201) 555-0110', 'sam.demo@example.com', '', null],
  ['Noor Haddad', '(201) 555-0111', 'noor.demo@example.com', '', { year: 1997, month: 6, day: 21 }],
  ['Group project guy', '(201) 555-0112', '', '', null],
  ['Dr. Feldman office', '(201) 555-0113', '', 'Feldman Dental', null],
  ['Tomás Rivera', '(201) 555-0114', 'tomas.demo@example.com', '', { year: 1996, month: 1, day: 9 }],
  ['Uber driver left scarf', '(201) 555-0115', '', '', null],
  ['Kiki ✨', '(201) 555-0116', '', '', { month: 12, day: 5 }],
  ['', '', 'newsletter.demo@example.com', '', null],
  ['Ben from the hostel', '(201) 555-0117', '', '', null],
  ['Hana Kim', '(201) 555-0118', 'hana.demo@example.com', 'Paper Lantern Studio', { year: 1999, month: 4, day: 27 }],
  ['Pizza place', '(201) 555-0119', '', 'Slice Night', null],
  ['Rahul cousin', '(201) 555-0120', '', '', { year: 2001, month: 9, day: 18 }],
  ['Old work - Dana', '(201) 555-0121', 'dana.demo@example.com', 'Brightwell Co', null],
  ['Alex (dating app)', '(201) 555-0122', '', '', null],
  ['Zoe Marchetti', '(201) 555-0123', 'zoe.demo@example.com', '', { year: 1994, month: 7, day: 3 }],
];

// A few demo people come with extra details so the details and message screens have something to show.
const extras = {
  0: { howMet: 'School', metYear: '2016', instagram: 'priya.demo', nickname: 'Pri', labels: ['Friends'] },
  6: { howMet: 'Work', metYear: '2021', discord: 'devon.demo', title: 'Producer', department: 'Publishing', website: 'tidewater.example.com' },
  15: { howMet: 'Family', instagram: 'kiki.demo', tiktok: 'kiki.demo', custom: { 'Dog name': 'Biscuit' } },
  18: { address: '12 Lantern Row, Apt 3\nSpringfield', event: { year: 2022, month: 6, day: 4 } },
  22: { metYear: '2023' },
};

export const demoContacts = raw.map(([name, phone, email, org, birthday], i) =>
  withDisplayName({
    ...emptyContact(),
    id: `demo/${i}`,
    realName: name,
    phones: phone ? [phone] : [],
    emails: email ? [email] : [],
    org,
    birthday,
    ...extras[i],
  })
);
