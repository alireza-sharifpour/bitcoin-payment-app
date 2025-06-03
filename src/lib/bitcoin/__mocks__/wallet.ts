// Manual mock for wallet module
export const generateWalletAddress = jest.fn(() => {
  const randomSuffix = Math.random().toString(36).substring(2, 11);
  return `tb1q${randomSuffix}${randomSuffix}${randomSuffix}${randomSuffix}`.substring(0, 42);
});

export const isValidTestnetAddress = jest.fn((address: string) => {
  return typeof address === "string" && address.startsWith("tb1");
});