const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const { ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder, MessageFlags, Colors } = require('discord.js');
const { prisma } = require('../prisma');
const config = require('../config');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2 } = require('../config.json');

class ButtonHandler extends InteractionHandler {
	/**
	 * @param {InteractionHandler.LoaderContext} context
	 * @param {InteractionHandler.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
		this.s3 = new S3Client({
			region: 'auto',
			endpoint: r2.endpoint,
			credentials: {
				accessKeyId: r2.accessKey,
				secretAccessKey: r2.secret
			}
		});
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	async run(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const blacklistRequest = await prisma.blacklistRequests.findUnique({
			where: {
				id: interaction.message.embeds[0].footer.text
			}
		});
		if (!blacklistRequest) {
			return interaction.editReply({ content: 'הבלאקליסט לא נמצא', flags: MessageFlags.Ephemeral });
		}
		const blacklistingUser = await interaction.guild.members.fetch(blacklistRequest.userId);
		if (!blacklistingUser) {
			return interaction.editReply({ content: 'המשתמש לא נמצא', flags: MessageFlags.Ephemeral });
		}

		const blacklistedUser = await this.container.client.users.fetch(blacklistRequest.blacklistedUserId).catch(() => null);
		if (!blacklistedUser) {
			return interaction.editReply({ content: 'המשתמש לא נמצא', flags: MessageFlags.Ephemeral });
		}
		const guildMember = await interaction.guild.members.fetch(blacklistRequest.blacklistedUserId).catch(() => null);
		const blacklistChannel = interaction.guild.channels.cache.get(config.BlackListChannel);
		if (!blacklistChannel) {
			return interaction.editReply({ content: 'לא הצלחנו למצוא את החדר של הבלאקליסטים', flags: MessageFlags.Ephemeral });
		}
		if (guildMember && guildMember.roles.cache.has(config.BlackListRole)) {
			return interaction.editReply({ content: 'המשתמש כבר בלאקליסט', flags: MessageFlags.Ephemeral });
		} else if (guildMember) await guildMember.roles.add(config.BlackListRole);

		// Upload evidence to CDN
		let cdnEvidenceUrls = [];
		if (blacklistRequest.evidence && blacklistRequest.evidence.trim()) {
			try {
				cdnEvidenceUrls = await this.uploadEvidenceToCDN(blacklistRequest.evidence, blacklistRequest.id);

				// Update the database with CDN URLs
				await prisma.blacklistRequests.update({
					where: { id: blacklistRequest.id },
					data: { cdnEvidence: cdnEvidenceUrls }
				});

				console.log(`✅ Uploaded ${cdnEvidenceUrls.length} evidence files to CDN`);
			} catch (error) {
				console.error('❌ Failed to upload evidence to CDN:', error);
				// Continue with the process even if CDN upload fails
			}
		}

		console.log(blacklistRequest.evidence);
		const reasonTranslation = {
			nuke: 'ניוק',
			cheating: "צ'יטים",
			leaking: 'הדלפות מוצרים',
			doxing: 'הפצת פרטים אישיים',
			other: 'אחר'
		};

		const acceptEmbed = new EmbedBuilder()
			.setColor(config.embed_color)
			.setTitle('בלאקליסט מאושר')
			.setDescription(`בלאקליסט מאושר על ידי <@${interaction.user.id}>.`)
			.addFields(
				{
					name: 'משתמש לבלאקליסט',
					value: `<@${blacklistedUser.user ? blacklistedUser.user.id : blacklistedUser.id}> (${blacklistedUser.user ? blacklistedUser.user.username : blacklistedUser.username})`
				},
				{
					name: 'סיבה לבלאקליסט',
					value: Array.isArray(blacklistRequest.reason)
						? blacklistRequest.reason
								.map((r) => {
									if (r === 'other' && blacklistRequest.additionalInfo) {
										return `אחר - ${blacklistRequest.additionalInfo}`;
									}
									return reasonTranslation[r];
								})
								.join(', ')
						: blacklistRequest.reason
				},
				{
					name: 'הוכחות',
					value:
						cdnEvidenceUrls.length > 0
							? cdnEvidenceUrls.map((url, index) => `[הוכחה ${index + 1}](${url})`).join('\n')
							: blacklistRequest.evidence
									.split('\n')
									.map((evidence) => `[הוכחה](${evidence})`)
									.join('\n')
				}
			)
			.setFooter({ text: `${blacklistRequest.id}`, iconURL: interaction.guild.iconURL() });
		await interaction.message.edit({ embeds: [acceptEmbed], components: [] });
		const blacklistMessage = await blacklistChannel.send({
			embeds: [
				new EmbedBuilder()
					.setColor(Colors.Red)
					.setTitle(`${config.emojis.alert} בלאקליסט חדש ${config.emojis.alert}`)
					.setFields(
						{
							name: 'משתמש בבלאקליסט',
							value: `<@${blacklistedUser.id}> (${blacklistedUser.username})`
						},
						{
							name: 'סיבה לבלאקליסט',
							value: Array.isArray(blacklistRequest.reason)
								? blacklistRequest.reason
										.map((r) => {
											if (r === 'other' && blacklistRequest.additionalInfo) {
												return `אחר - ${blacklistRequest.additionalInfo}`;
											}
											return reasonTranslation[r];
										})
										.join(', ')
								: blacklistRequest.reason
						},
						{
							name: 'הוכחות',
							value:
								cdnEvidenceUrls.length > 0
									? cdnEvidenceUrls.map((url, index) => `[הוכחה ${index + 1}](${url})`).join('\n')
									: blacklistRequest.evidence
											.split('\n')
											.map((evidence) => `[הוכחה](${evidence})`)
											.join('\n')
						}
					)
					.setThumbnail(blacklistedUser.displayAvatarURL() || interaction.guild.iconURL())
					.setFooter({ text: 'יש להזהר בקרבת משתמש זה', iconURL: interaction.guild.iconURL() })
			]
		});
		try {
			await blacklistingUser.send({
				embeds: [
					new EmbedBuilder()
						.setColor(config.embed_color)
						.setTitle('בקשת בלאקליסט אושרה!')
						.setDescription(
							`בקשת הבלאקליסט שלך על ${blacklistedUser.user ? blacklistedUser.user.username : blacklistedUser.username} אושרה.`
						)
						.setFooter({ text: `${blacklistRequest.id}`, iconURL: interaction.guild.iconURL() })
				],
				components: [
					new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('dm_delete').setLabel('מחק הודעה').setStyle(ButtonStyle.Secondary),
						new ButtonBuilder()
							.setLabel('צפה בבלאקליסט')
							.setStyle(ButtonStyle.Link)
							.setURL(`https://discord.com/channels/${interaction.guild.id}/${config.BlackListChannel}/${blacklistMessage.id}`)
					)
				]
			});
		} catch (error) {
			console.error(error);
		}
		return interaction.editReply({ content: 'בלאקליסט מאושר בהצלחה', flags: MessageFlags.Ephemeral });
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'acceptblacklist') return this.none();
		return this.some();
	}

	/**
	 * Uploads the image to R2.
	 * @param {string} key
	 * @param {Buffer} imageData
	 * @param {string} contentType
	 * @returns {Promise<string>} The URL of the uploaded image.
	 */
	async uploadToR2(key, imageData, contentType) {
		const command = new PutObjectCommand({
			Bucket: r2.bucketName,
			Key: `${key}`,
			Body: imageData,
			ContentType: contentType
		});

		try {
			await this.s3.send(command);

			const customUrl = `https://${r2.customDomain}/${r2.bucketName}/${key}`;
			console.log('✅ Uploaded R2 Custom URL:', customUrl);
			return customUrl;
		} catch (err) {
			console.error('❌ Error uploading to R2:', err);
			throw new Error('Failed to upload to R2.');
		}
	}

	/**
	 * Uploads evidence images to CDN and returns CDN URLs.
	 * @param {string} evidenceString - The evidence URLs separated by newlines
	 * @param {string} blacklistId - The blacklist request ID
	 * @returns {Promise<string[]>} Array of CDN URLs
	 */
	async uploadEvidenceToCDN(evidenceString, blacklistId) {
		const evidenceUrls = evidenceString.split('\n').filter((url) => url.trim());
		const cdnUrls = [];

		for (let i = 0; i < evidenceUrls.length; i++) {
			try {
				const url = evidenceUrls[i].trim();

				// Fetch the image data using fetch (same as setServerImage.js)
				const response = await fetch(url);
				const imageData = Buffer.from(await response.arrayBuffer());

				// Extract file extension from URL or default to jpg
				const urlParts = url.split('.');
				const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';

				// Use timestamp-based naming like setServerImage.js
				const fileName = `blacklist-evidence/${blacklistId}/${Date.now()}-${i + 1}.${extension}`;
				const contentType = response.headers.get('content-type') || `image/${extension}`;

				const cdnUrl = await this.uploadToR2(fileName, imageData, contentType);
				cdnUrls.push(cdnUrl);

				console.log(`✅ Uploaded evidence ${i + 1}/${evidenceUrls.length} to CDN`);
			} catch (error) {
				console.error(`❌ Failed to upload evidence ${i + 1}:`, error);
				// Continue with other uploads even if one fails
			}
		}

		return cdnUrls;
	}
}

module.exports = {
	ButtonHandler
};
