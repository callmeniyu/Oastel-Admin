// Payment Recovery API Client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface OrphanedPayment {
  paymentIntentId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  packageType: string;
  packageId: string;
  packageName?: string;  // Package display name
  totalGuests?: string;  // Total number of guests (adults + children)
  date: string;
  time: string;
  created: Date;
  metadata: Record<string, any>;
}

export interface ScanResult {
  success: boolean;
  summary: {
    totalScanned: number;
    successfulWithBookings: number;
    orphanedPayments: number;
    timeRange: string;
  };
  orphanedPayments: OrphanedPayment[];
  message?: string;
}

export interface RecoveryResult {
  success: boolean;
  message?: string;
  bookingId?: string;
  paymentIntentId?: string;
  customerEmail?: string;
  amount?: number;
  currency?: string;
  error?: string;
  alreadyExists?: boolean;
}

export interface PaymentDetails {
  success: boolean;
  payment: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    created: Date;
    metadata: Record<string, any>;
    paymentMethod: string[];
    lastPaymentError?: any;
  };
  booking: {
    id: string;
    status: string;
    packageType: string;
    packageName: string;
    date: string;
    time: string;
    customerEmail: string;
    customerName: string;
    paymentStatus: string;
    createdAt: Date;
  } | null;
  analysis: {
    hasBooking: boolean;
    paymentSucceeded: boolean;
    isOrphaned: boolean;
    canRecover: boolean;
    recommendation: string;
  };
}

export interface BatchRecoveryResult {
  success: boolean;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  results: Array<{
    paymentIntentId: string;
    success: boolean;
    bookingId?: string;
    message?: string;
    error?: string;
  }>;
}

export const recoveryApi = {
  // Scan for orphaned payments
  scanOrphanedPayments: async (hours: number = 24, limit: number = 50): Promise<ScanResult> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/recovery/scan?hours=${hours}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error scanning orphaned payments:", error);
      throw error;
    }
  },

  // Recover a single payment
  recoverPayment: async (paymentIntentId: string): Promise<RecoveryResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recovery/recover-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentIntentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error recovering payment:", error);
      throw error;
    }
  },

  // Get payment details
  getPaymentDetails: async (paymentIntentId: string): Promise<PaymentDetails> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recovery/payment/${paymentIntentId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting payment details:", error);
      throw error;
    }
  },

  // Batch recover multiple payments
  batchRecover: async (paymentIntentIds: string[]): Promise<BatchRecoveryResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recovery/batch-recover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentIntentIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error batch recovering payments:", error);
      throw error;
    }
  },

  // Get cancelled/refunded bookings
  getRefundedBookings: async (): Promise<{ success: boolean; data: any[] }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recovery/refunded`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error getting refunded bookings:", error);
      throw error;
    }
  },
};
