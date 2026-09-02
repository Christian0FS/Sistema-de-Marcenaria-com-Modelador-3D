export declare const getMaxValueIndex: (array: number[]) => number;
export declare const getMinValueIndex: (array: number[]) => number;
/**
 * Returns the index of the smallest number in an array of numbers
 */
export declare function getValueIndex(array: number[], comparator: (value: number, tracked: number) => boolean): number;
