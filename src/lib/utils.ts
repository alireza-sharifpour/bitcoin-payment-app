// Import clsx library for conditional class name handling
// ClassValue type represents all possible input types clsx can accept
import { clsx, type ClassValue } from "clsx";

// Import tailwind-merge for resolving Tailwind CSS class conflicts
import { twMerge } from "tailwind-merge";

/**
 * Utility function to combine and optimize CSS class names
 * Commonly used in shadcn/ui and Tailwind CSS projects
 *
 * @param inputs - Variable number of class name inputs (strings, objects, arrays, etc.)
 * @returns Optimized class string with conflicts resolved
 *
 * Examples:
 * cn("text-red-500", "font-bold") → "text-red-500 font-bold"
 * cn("text-red-500", "text-blue-500") → "text-blue-500" (conflict resolved)
 * cn("base", isActive && "active") → "base active" (if isActive is true)
 */
export function cn(...inputs: ClassValue[]) {
  // Step 1: clsx combines all inputs into a single class string
  // Handles conditional classes, objects, arrays, etc.

  // Step 2: twMerge removes conflicting Tailwind classes
  // Keeps the last occurrence of conflicting utilities
  // Example: "p-4 p-6" becomes "p-6"
  return twMerge(clsx(inputs));
}
