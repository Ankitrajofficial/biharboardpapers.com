import type { ClassId } from '@/content/types';

/** One-time plans, each valid until that class's board exam ends (date from exam-calendar.json). */
export interface Plan {
  id: 'matric' | 'inter' | 'all';
  name: { hi: string; en: string };
  priceInr: number;
  /** Which classes this plan unlocks */
  classes: ClassId[];
  includes: { hi: string[]; en: string[] };
}

export const plans: Plan[] = [
  {
    id: 'matric',
    name: { hi: 'मैट्रिक प्लान', en: 'Matric Plan' },
    priceInr: 149,
    classes: ['class-10'],
    includes: {
      hi: ['कक्षा 10 के सभी ऑब्जेक्टिव प्रश्न', 'सभी महत्वपूर्ण प्रश्न', 'बोर्ड पैटर्न के पूरे मॉक टेस्ट', 'सेंट-अप तैयारी', 'PDF डाउनलोड'],
      en: ['All Class 10 objective questions', 'All important questions', 'Full board-pattern mock tests', 'Sent-up preparation', 'PDF downloads'],
    },
  },
  {
    id: 'inter',
    name: { hi: 'इंटर प्लान', en: 'Intermediate Plan' },
    priceInr: 199,
    classes: ['class-12'],
    includes: {
      hi: ['कक्षा 12 (कला, विज्ञान, वाणिज्य) की पूरी सुविधा', 'सभी ऑब्जेक्टिव व महत्वपूर्ण प्रश्न', 'बोर्ड पैटर्न के पूरे मॉक टेस्ट', 'सेंट-अप व प्रैक्टिकल तैयारी', 'PDF डाउनलोड'],
      en: ['Full access for Class 12 (Arts, Science, Commerce)', 'All objective and important questions', 'Full board-pattern mock tests', 'Sent-up and practical preparation', 'PDF downloads'],
    },
  },
  {
    id: 'all',
    name: { hi: 'सभी प्लान', en: 'All Access' },
    priceInr: 299,
    classes: ['class-10', 'class-12'],
    includes: {
      hi: ['कक्षा 10 और 12 दोनों की पूरी सुविधा', 'एक ही खाते में सब कुछ'],
      en: ['Full access for both Class 10 and Class 12', 'Everything in one account'],
    },
  },
];

export const planById = (id: string) => plans.find((p) => p.id === id);

/** The cheapest plan that unlocks a given class (used for the one-line lock message). */
export const planForClass = (classId: ClassId) =>
  plans.filter((p) => p.classes.includes(classId)).sort((a, b) => a.priceInr - b.priceInr)[0];
