export type Currency = "USD" | "NGN";

export type Tailor = {
  id: string;
  slug: string;
  name: string;
  studio: string;
  location: string;
  grade: 1 | 2 | 3 | 4 | 5;
  rating: number;
  reviews: number;
  completedJobs: number;
  onTimeRate: number;
  specialties: string[];
  startingPriceKobo: number;
  turnaround: string;
  activeJobs: number;
  capacity: number;
  imagePosition: string;
  bio: string;
  verified: boolean;
};

export type OrderStage =
  | "design"
  | "materials"
  | "cutting"
  | "sewing"
  | "fitting"
  | "finishing"
  | "ready"
  | "shipped"
  | "delivered";

export type Order = {
  id: string;
  reference: string;
  title: string;
  tailor: string;
  tailorSlug: string;
  stage: OrderStage;
  dueDate: string;
  amountKobo: number;
  paidKobo: number;
  progress: number;
};

export type GradeMetrics = {
  completedJobs: number;
  rating: number;
  onTimeRate: number;
  cancellationRate: number;
  lostDisputeRate: number;
};

export type QuoteBreakdown = {
  tailoringSubtotalKobo: number;
  deliveryKobo: number;
  paystackFeesKobo: number;
  refundsKobo?: number;
  adjustmentsKobo?: number;
};

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "rescheduled";

export type Appointment = {
  id: string;
  requestId: string | null;
  orderId: string | null;
  customerId: string;
  customerName: string;
  tailorId: string;
  tailorName: string;
  startsAt: string;
  endsAt: string;
  meetingUrl: string | null;
  status: AppointmentStatus;
};
