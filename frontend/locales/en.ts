export const en = {
  nav: { home: 'Home', map: 'Explore', upload: 'Upload', alerts: 'Alerts', contribute: 'Contribute' },
  home: {
    eyebrow: 'Malayalam + English · AI-assisted',
    title: 'Turn timetables into useful transit data.',
    description: 'Capture a bus timetable, let eppo varum structure the route, verify uncertain fields, and explore the result on a map.',
    upload: 'Upload timetable',
    explore: 'Explore bus stops',
    howTitle: 'From paper to the people who need it.',
    howDescription: 'A calm, human-checked workflow for the timetables that live on walls, windows, and phone galleries.',
    steps: [['01', 'Capture', 'Take a clear photo or upload a PDF.'], ['02', 'Digitize', 'AI reads Malayalam, English, rows, and times.'], ['03', 'Verify', 'Review the fields that need your eye.'], ['04', 'Explore', 'Share the result through maps and schedules.']],
    sample: 'A real timetable, made usable',
    sampleText: 'Every published schedule keeps its source, confidence, and verification history visible.',
    trust: ['Human verification', 'Confidence-aware extraction', 'Source tracking', 'GTFS-compatible data']
  },
  upload: {
    upload: 'Upload timetable',
    title: 'Digitize a timetable',
    subtitle: 'Start with a photo from a bus stop or a timetable PDF.',
    drop: 'Drop a timetable here',
    dropSub: 'or choose an image or PDF from your device',
    camera: 'Capture with camera',
    choose: 'Choose a file',
    formats: 'JPG · PNG · WEBP · PDF · up to 10 MB image / 25 MB PDF',
    processing: 'Processing timetable',
    stages: ['Reading document', 'Understanding table', 'Structuring stops and times', 'Checking extraction'],
    result: 'Extraction ready for review',
    review: 'Open verification',
    retry: 'Try another file'
  },
  map: { title: 'Explore bus stops', subtitle: 'Find scheduled buses from stops across the route.', search: 'Search Angamaly or അങ്കമാലി', selected: 'Selected stop', upcoming: 'Upcoming scheduled buses', setAlert: 'Set a scheduled alert', empty: 'Choose a stop to see its timetable.', scheduled: 'Based on scheduled timetable' },
  alerts: { title: 'Scheduled alerts', subtitle: 'Helpful reminders based on timetable data, never a live bus location.', demo: 'Demo mode', trigger: 'Trigger next alert', active: 'Active alert', notify: 'Notify 5 minutes before', note: 'This is a timetable-based alert, not live tracking.', noAlerts: 'No alerts yet', noAlertsText: 'Choose a stop and we will help you create a reminder.' },
  verify: { title: 'Review extraction', subtitle: 'Your eye is the final check before timetable data becomes useful.', source: 'Source document', extracted: 'Extracted data', route: 'Route', save: 'Save correction', publish: 'Verify and publish', review: 'Needs review', verified: 'High confidence', saved: 'Correction saved locally', warning: 'Check this value against the source image.' }
} as const;
