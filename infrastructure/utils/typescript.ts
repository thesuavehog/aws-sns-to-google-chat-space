/**
 * @param  {new(message:string, ...args: any[])} errorType
 * @param  {string} message
 * @param  {any[]} args
 * @returns never
 */
export function throwError<T extends Error = Error>(
	errorType: new (message: string, ...args: any[]) => T,
	message: string,
	...args: any[]
): never {
	const e: Error = new errorType(message, ...args);
	// Maintains proper stack trace for where throwError was called by
	// removing the call to throwError from the trace
	if (Error.captureStackTrace) {
		Error.captureStackTrace(e, throwError);
	}
	throw e;
}
