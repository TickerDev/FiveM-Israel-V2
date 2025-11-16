const AWS = require('@aws-sdk/client-s3');

class R2Uploader {
	/**
	 * @param {object} options
	 * @param {string} options.bucketName - The name of the R2 bucket
	 * @param {string} options.endpoint - The R2 endpoint URL
	 * @param {string} options.accessKeyId - Your R2 access key ID
	 * @param {string} options.secretAccessKey - Your R2 secret access key
	 * @param {string} options.customDomain - The custom domain to use for public URLs (e.g., image.fivemisrael.com)
	 */
	constructor({ bucketName, endpoint, accessKeyId, secretAccessKey, customDomain }) {
		this.bucketName = bucketName;
		this.customDomain = customDomain;

		this.s3 = new AWS.S3({
			endpoint: endpoint,
			accessKeyId: accessKeyId,
			secretAccessKey: secretAccessKey,
			region: 'auto'
		});
	}

	/**
	 * Upload a file to R2.
	 * @param {Buffer} fileData - The file data as a Buffer
	 * @param {string} fileName - The name to save the file as in the bucket
	 * @param {string} contentType - The MIME type of the file (e.g., 'image/png')
	 * @returns {Promise<string>} The public URL of the uploaded file
	 */
	async uploadFile(fileData, fileName, contentType) {
		const params = {
			Bucket: this.bucketName,
			Key: fileName,
			Body: fileData,
			ContentType: contentType,
			s: 'public-read'
		};

		try {
			const uploadResult = await this.s3.upload(params).promise();
			const publicUrl = `${this.customDomain}/${fileName}`;
			return publicUrl;
		} catch (error) {
			console.error('Error uploading file:', error);
			throw new Error('File upload failed.');
		}
	}

	/**
	 * Generate a public URL for a file in the bucket.
	 * @param {string} fileName - The file name in the bucket
	 * @returns {string} The public URL
	 */
	generatePublicUrl(fileName) {
		return `${this.customDomain}/${fileName}`;
	}

	/**
	 * Delete a file from the R2 bucket.
	 * @param {string} fileName - The file name to delete
	 * @returns {Promise<void>}
	 */
	async deleteFile(fileName) {
		const params = {
			Bucket: this.bucketName,
			Key: fileName
		};

		try {
			await this.s3.deleteObject(params).promise();
			console.log(`File deleted successfully: ${fileName}`);
		} catch (error) {
			console.error('Error deleting file:', error);
			throw new Error('File deletion failed.');
		}
	}

	/**
	 * List all files in the R2 bucket.
	 * @returns {Promise<string[]>} An array of file names
	 */
	async listFiles() {
		const params = {
			Bucket: this.bucketName
		};

		try {
			const data = await this.s3.listObjectsV2(params).promise();
			const fileNames = data.Contents.map((item) => item.Key);
			console.log('Files in bucket:', fileNames);
			return fileNames;
		} catch (error) {
			console.error('Error listing files:', error);
			throw new Error('File listing failed.');
		}
	}
}

module.exports = R2Uploader;
