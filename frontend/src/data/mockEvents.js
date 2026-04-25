export const MOCK_EVENTS = [
  {
    id: 'mock-1',
    name: 'AI Research Symposium 2026',
    description:
      'A deep dive into the latest AI and machine learning research from faculty and industry leaders. Keynote + hands-on sessions.',
    type: 'academic',
    date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    time: '09:00 AM',
    place: 'SLIIT Main Auditorium',
    totalSeats: 300,
    registeredCount: 187,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1600&auto=format&fit=crop',
    status: 'approved',
  },
  {
    id: 'mock-2',
    name: 'Cloud-Native Workshop',
    description:
      'Hands-on workshop on Docker, Kubernetes and modern cloud deployment patterns.',
    type: 'work',
    date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    time: '10:00 AM',
    place: 'Lab B-201',
    totalSeats: 40,
    registeredCount: 29,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop',
    status: 'approved',
  },
  {
    id: 'mock-3',
    name: 'Inter-Faculty Football Tournament',
    description:
      'Annual sports event bringing together all faculties for a day of friendly competition.',
    type: 'sports',
    date: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
    time: '02:00 PM',
    place: 'SLIIT Sports Ground',
    totalSeats: 500,
    registeredCount: 312,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1459865264687-595d652de67e?q=80&w=1600&auto=format&fit=crop',
    status: 'approved',
  },
  {
    id: 'mock-4',
    name: 'Batch Night 2026',
    description:
      'End-of-year social evening with music, food, awards and memories.',
    type: 'social',
    date: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    time: '07:00 PM',
    place: 'Grand Ballroom',
    totalSeats: 800,
    registeredCount: 654,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop',
    status: 'approved',
  },
]
