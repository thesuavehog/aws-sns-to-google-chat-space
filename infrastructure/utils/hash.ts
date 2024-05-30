import crypto from 'crypto';

/**
 * Create a short hash of a longer ID - typically used when CDK creates a resource name
 * that is too long for AWS and you need to manually genreate a shorter name.
 *
 * @param id the value to hash
 * @param len the final length of the hash to create
 * @returns a hashed value of {@link id} via the `shake256` algorithm expressed in hexadecimal
 */
export function hash(id: string, len: number = 4): string {
	return crypto.createHash('shake256', { outputLength: len }).update(id).digest('hex').toUpperCase();
}
