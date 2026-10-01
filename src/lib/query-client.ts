import { QueryClient } from "@tanstack/react-query";

/**
 * Global TanStack React Query Client configured for Noble Edu.
 * Optimizes network requests via smart staleness, caching, and retry policies.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep inactive cache data in memory for 15 minutes
      gcTime: 15 * 60 * 1000,
      // Avoid aggressive automatic background refetches on window focus
      refetchOnWindowFocus: false,
      // Re-connect refetch
      refetchOnReconnect: "always",
      // Retry failed network queries twice with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Type-safe query key factory for centralized cache key management
 */
export const queryKeys = {
  all: ["nobleEdu"] as const,
  initialData: (userId?: string | null) => ["nobleEdu", "initialData", userId || "all"] as const,
  schools: () => ["nobleEdu", "schools"] as const,
  users: (schoolId?: string | null) => ["nobleEdu", "users", schoolId || "all"] as const,
  students: (schoolId?: string | null) => ["nobleEdu", "students", schoolId || "all"] as const,
  classes: (schoolId?: string | null) => ["nobleEdu", "classes", schoolId || "all"] as const,
  marks: (schoolId?: string | null) => ["nobleEdu", "marks", schoolId || "all"] as const,
  attendance: (schoolId?: string | null) => ["nobleEdu", "attendance", schoolId || "all"] as const,
  audit: (schoolId?: string | null) => ["nobleEdu", "audit", schoolId || "all"] as const,
  notifications: () => ["nobleEdu", "notifications"] as const,
};
