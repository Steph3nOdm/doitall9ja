export type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    id: 'general-what-is-doitall9ja',
    category: 'General',
    question: 'What is DoItAll9ja?',
    answer:
      'DoItAll9ja is a platform that connects you with verified technicians for home and business services. You can request a service, receive a professional quote, and pay securely all in one place.',
  },
  {
    id: 'general-how-platform-works',
    category: 'General',
    question: 'How does the platform work?',
    answer:
      'You submit a service request, a technician reviews or inspects the job, provides a detailed quote, and once you approve and pay, the job is scheduled and completed.',
  },
  {
    id: 'general-need-account',
    category: 'General',
    question: 'Do I need an account to use the platform?',
    answer:
      'Yes, you need to create an account to track your bookings, receive quotes, and make secure payments.',
  },
  {
    id: 'booking-request-service',
    category: 'Booking',
    question: 'How do I request a service?',
    answer:
      'Go to your dashboard, select a service, fill in the job details, and submit your request.',
  },
  {
    id: 'booking-without-login',
    category: 'Booking',
    question: 'Can I request a service without logging in?',
    answer:
      'You can start a request, but you will be required to sign in before submitting to ensure proper tracking and communication.',
  },
  {
    id: 'booking-edit-request',
    category: 'Booking',
    question: 'Can I edit my request after submitting?',
    answer:
      'You can update your request before a technician is assigned or before a quote is submitted.',
  },
  {
    id: 'booking-cancel',
    category: 'Booking',
    question: 'Can I cancel a booking?',
    answer:
      'Yes, you can cancel a booking before payment or before the job begins.',
  },
  {
    id: 'quotes-why-before-payment',
    category: 'Quotes',
    question: 'Why do I need a quote before payment?',
    answer:
      "Some services require inspection to determine the exact cost. Technicians provide itemized quotes so you know exactly what you're paying for.",
  },
  {
    id: 'quotes-what-include',
    category: 'Quotes',
    question: 'What does the quote include?',
    answer:
      'Quotes include a breakdown of items, labor costs, quantities, and total price for transparency.',
  },
  {
    id: 'quotes-negotiate',
    category: 'Quotes',
    question: 'Can I negotiate the quote?',
    answer:
      'Quotes are structured for accuracy, but you can reject a quote and request clarification or adjustments.',
  },
  {
    id: 'quotes-accept',
    category: 'Quotes',
    question: 'How do I accept a quote?',
    answer:
      "Go to your booking, review the quote, and click 'Accept Quote' to proceed to payment.",
  },
  {
    id: 'quotes-reject',
    category: 'Quotes',
    question: 'What happens if I reject a quote?',
    answer:
      'The booking will be cancelled or marked inactive unless you request another quote.',
  },
  {
    id: 'payments-how-to-pay',
    category: 'Payments',
    question: 'How do I pay for a service?',
    answer:
      "After accepting a quote, click 'Pay Now' to complete payment securely through our payment provider.",
  },
  {
    id: 'payments-secure',
    category: 'Payments',
    question: 'Is my payment secure?',
    answer:
      'Yes, all payments are processed securely via Paystack.',
  },
  {
    id: 'payments-when-charged',
    category: 'Payments',
    question: 'When am I charged?',
    answer:
      'You are only charged after you approve a quote and choose to proceed with the job.',
  },
  {
    id: 'payments-before-inspection',
    category: 'Payments',
    question: 'Can I pay before inspection?',
    answer:
      'For fixed-price services, yes. For inspection-based jobs, payment happens after the quote is approved.',
  },
  {
    id: 'payments-after-payment',
    category: 'Payments',
    question: 'What happens after I make payment?',
    answer:
      'Your booking is confirmed, the technician is assigned, and the job is scheduled.',
  },
  {
    id: 'technicians-verified',
    category: 'Technicians',
    question: 'Are technicians verified?',
    answer:
      'Yes, technicians on the platform are vetted to ensure quality and professionalism.',
  },
  {
    id: 'technicians-assigned',
    category: 'Technicians',
    question: 'How are technicians assigned?',
    answer:
      'Technicians are matched based on service type, skills, availability, and location.',
  },
  {
    id: 'technicians-choose',
    category: 'Technicians',
    question: 'Can I choose my technician?',
    answer:
      'Assignments are handled by the platform to ensure the best match for your job.',
  },
  {
    id: 'technicians-contact-direct',
    category: 'Technicians',
    question: 'Can I contact a technician directly?',
    answer:
      'Direct contact is available after payment to protect both clients and technicians.',
  },
  {
    id: 'jobs-when-start',
    category: 'Jobs & Execution',
    question: 'When does the job start?',
    answer:
      'The job starts after payment is confirmed and scheduled with the assigned technician.',
  },
  {
    id: 'jobs-start-without-payment',
    category: 'Jobs & Execution',
    question: 'Can a technician start without payment?',
    answer:
      'No, payment must be completed before any job begins.',
  },
  {
    id: 'jobs-track-status',
    category: 'Jobs & Execution',
    question: 'How do I track my job?',
    answer:
      'You can track job status from your dashboard in real-time.',
  },
  {
    id: 'issues-not-satisfied',
    category: 'Issues & Support',
    question: 'What if I am not satisfied with the job?',
    answer:
      'Contact support and we will review your case and assist with resolution.',
  },
  {
    id: 'issues-contact-support',
    category: 'Issues & Support',
    question: 'How do I contact support?',
    answer:
      'You can use the in-app chat or contact support via the provided support options.',
  },
  {
    id: 'issues-no-show',
    category: 'Issues & Support',
    question: 'What happens if a technician does not show up?',
    answer:
      'Contact support immediately and we will resolve the issue or reassign the job.',
  },
  {
    id: 'account-update-profile',
    category: 'Account',
    question: 'How do I update my profile?',
    answer:
      'Go to your profile page and edit your details, then save changes.',
  },
  {
    id: 'account-change-contact',
    category: 'Account',
    question: 'Can I change my phone number or email?',
    answer:
      'Yes, you can update your contact details in your profile settings.',
  },
  {
    id: 'account-forgot-password',
    category: 'Account',
    question: 'I forgot my password, what should I do?',
    answer:
      "Use the 'Forgot Password' option on the login page to reset your password.",
  },
];
