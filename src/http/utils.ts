const trueValues = [1, "1", "true", "y", "Y"];

export const toBoolean = (val: any): boolean => trueValues.includes(val);

export const toInt = (val: string): number => parseInt(val);

export const toNumber = (val: string): number => parseFloat(val);

export const simpleCsvToList = (val: string): string[] => val.split(",");
