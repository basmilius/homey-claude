import type HomeyImage from 'homey/lib/Image';

/**
 * The result of reading a Homey Image token into a buffer.
 */
export type ImageBuffer = {
    readonly buffer: Buffer;
    readonly mimeType: string;
};

/**
 * Reads a Homey Image token stream into a Buffer with its MIME type.
 *
 * @param image - The Homey Image token to read.
 */
export async function imageToBuffer(image: HomeyImage): Promise<ImageBuffer> {
    const stream = await image.getStream();
    const mimeType = (stream as NodeJS.ReadableStream & { contentType?: string }).contentType ?? 'image/jpeg';
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }

    return {
        buffer: Buffer.concat(chunks),
        mimeType
    };
}
