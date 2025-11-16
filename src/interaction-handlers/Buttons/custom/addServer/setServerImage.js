const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const Discord = require('discord.js');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { r2 } = require('../../../../config.json');
const config = require('../../../../config');

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
		const modal = new Discord.ModalBuilder()
			.setCustomId('setserverimage')
			.setTitle('שינוי תמונת שרת')
			.addLabelComponents(
				new Discord.LabelBuilder()
					.setLabel("תמונת שרת")
					.setFileUploadComponent(
						new Discord.FileUploadBuilder()
							.setCustomId('setserverimage')
							.setMaxValues(1)
							.setMinValues(1)
							.setRequired(true)
					)
			);
		await interaction.showModal(modal);

		try {
			const i = await interaction.awaitModalSubmit({
				time: 30_000,
				filter: (x) => x.customId === 'setserverimage' && x.user.id === interaction.user.id
			});
			await i.deferReply({ flags: Discord.MessageFlags.Ephemeral });

			const images = i.fields.getUploadedFiles('setserverimage');
			if (!images || images.size === 0) {
				return i.editReply({
					content: 'אין תמונה שנשלחה.'
				});
			}

			const image = images.at(0);
			const AllowedContents = ['image/png', 'image/gif', 'image/jpg', 'image/jpeg'];
			if (!AllowedContents.includes(image.contentType)) {
				return i.editReply({
					content: 'נכון לכרגע אנחנו מקבלים רק את הקבצים הבאים:\n```\n.png\n.jpg\n.jpeg\n.gif```'
				});
			}

			const response = await fetch(image.url);
			const imageData = Buffer.from(await response.arrayBuffer());

			const fileName = `logos/${Date.now()}-${image.name}`;
			const contentType = response.headers.get('content-type') || 'application/octet-stream';
			const url = await this.uploadToR2(fileName, imageData, contentType);
			console.log('Uploaded R2 Image URL:', url);

			const message = await interaction.channel.messages.fetch(interaction.channel.topic.split(' ')[0]);
			const originalComponents = message.components;

			const { title, description } = this.extractTitleAndDescription(originalComponents);
			const categoryInfo = this.extractCategoryInfo(originalComponents);
			const socialButtons = this.getSocialButtons(originalComponents);
			const voteCount = this.extractVoteCount(originalComponents);

			const socialButtonBuilders = [];
			socialButtons.forEach((social) => {
				const btn = new Discord.ButtonBuilder().setLabel(social.label).setStyle(Discord.ButtonStyle.Link).setURL(social.url);

				if (social.emoji) {
					btn.setEmoji(social.emoji);
				}

				socialButtonBuilders.push(btn);
			});

			const socialOrder = { youtube: 3, tiktok: 2, website: 1 };
			socialButtonBuilders.sort((a, b) => {
				const typeA = ['youtube', 'tiktok', 'website'].find((t) => a.data.label.toLowerCase().includes(t));
				const typeB = ['youtube', 'tiktok', 'website'].find((t) => b.data.label.toLowerCase().includes(t));
				return (socialOrder[typeA] || 99) - (socialOrder[typeB] || 99);
			});

			const votes = new Discord.ButtonBuilder()
				.setCustomId('votes_display')
				.setLabel(voteCount || '0')
				.setDisabled(true)
				.setStyle(Discord.ButtonStyle.Secondary);

			const joinUrl = this.extractJoinUrl(originalComponents);
			const join = new Discord.ButtonBuilder()
				.setLabel('Join Here')
				.setStyle(Discord.ButtonStyle.Link)
				.setURL(joinUrl || 'https://discord.gg/6xwuYRPzd4');

			const VoteButton = new Discord.ButtonBuilder()
				.setLabel('Vote Server')
				.setCustomId('voteforserver')
				.setStyle(Discord.ButtonStyle.Secondary);

			const ServerOwnerOptions = new Discord.ButtonBuilder()
				.setLabel('Options')
				.setCustomId('owneroptions')
				.setStyle(Discord.ButtonStyle.Secondary);

			const server = await this.container.client.db.getServer(interaction.channelId);
			const isVerified = server ? server.verified : false;

			const titlePrefix = isVerified ? config.emojis.verified : '';
			const displayTitle = title ? `# ${titlePrefix} ${title.replace('# ', '')}` : '# שם השרת שלך';

			const container = new Discord.ContainerBuilder()
				.setAccentColor(Discord.Colors.Blurple)
				.addSectionComponents(
					new Discord.SectionBuilder()
						.addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent(displayTitle))
						.setThumbnailAccessory(new Discord.ThumbnailBuilder().setURL(url))
						.addTextDisplayComponents(
							new Discord.TextDisplayBuilder().setContent(description || 'שרת אלווליסט בעל רמת תכנות ורולפליי מהגבוהות ביותר שניתן להציע')
						)
				)
				.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(Discord.SeparatorSpacingSize.Large))
				.addSectionComponents(
					new Discord.SectionBuilder().addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent('## Votes')).setButtonAccessory(votes)
				)
				.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(Discord.SeparatorSpacingSize.Large));

			if (socialButtonBuilders.length > 0) {
				container.addActionRowComponents(new Discord.ActionRowBuilder().setComponents(socialButtonBuilders));
				container.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(Discord.SeparatorSpacingSize.Small));
			}

			container.addActionRowComponents(new Discord.ActionRowBuilder().setComponents([join, VoteButton, ServerOwnerOptions]));

			if (categoryInfo) {
				container.addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent(categoryInfo));
			}

			const controlRows = this.extractControlRows(originalComponents);

			setTimeout(async () => {
				await message.edit({
					flags: Discord.MessageFlags.IsComponentsV2,
					components: [container, ...controlRows]
				});
			}, 5000);

			await i.editReply({ content: 'תמונה שונתה' });
		} catch (error) {
			console.error('Error in setserverimage:', error);
		}
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
			Key: key,
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

	extractTitleAndDescription(components) {
		let title = null;
		let description = null;
		for (const component of components) {
			if (component.type === Discord.ComponentType.Container) {
				for (const section of component.components || []) {
					if (section.type === Discord.ComponentType.Section) {
						for (const textComponent of section.components || []) {
							if (textComponent.type === Discord.ComponentType.TextDisplay) {
								if (textComponent.content.startsWith('# ')) {
									title = textComponent.content.replace(config.emojis.verified, '').replace(/\s+/g, ' ').trim();
								} else if (!title) {
									description = textComponent.content;
								}
							}
						}
					}
				}
			}
		}
		return { title, description };
	}

	extractCategoryInfo(components) {
		for (const component of components) {
			if (component.type === Discord.ComponentType.Container) {
				for (const textDisplay of component.components || []) {
					if (textDisplay.type === Discord.ComponentType.TextDisplay) {
						const content = textDisplay.content;
						if (content?.startsWith('-# Category:')) {
							return content;
						}
					}
				}
			}
		}
		return null;
	}

	extractVoteCount(components) {
		for (const component of components) {
			if (component.type === Discord.ComponentType.Container) {
				for (const section of component.components || []) {
					if (section.type === Discord.ComponentType.Section) {
						const accessory = section.accessory;
						if (accessory?.type === Discord.ComponentType.Button && accessory.customId === 'votes_display') {
							return accessory.label;
						}
					}
				}
			}
		}
		return null;
	}

	extractJoinUrl(components) {
		for (const container of components) {
			for (const section of container.components ?? []) {
				if (section.type === Discord.ComponentType.ActionRow) {
					for (const component of section.components ?? []) {
						if (
							component.type === Discord.ComponentType.Button &&
							component.style === Discord.ButtonStyle.Link &&
							component.label === 'Join Here'
						) {
							return component.url;
						}
					}
				}
			}
		}
		return null;
	}

	getSocialButtons(components) {
		const socialTypes = ['youtube', 'tiktok', 'website'];
		const foundSocials = [];
		for (const container of components) {
			for (const section of container.components ?? []) {
				if (section.type === Discord.ComponentType.ActionRow) {
					for (const component of section.components ?? []) {
						const label = component.label?.toLowerCase() ?? '';
						const isLinkButton =
							component.type === Discord.ComponentType.Button && component.style === Discord.ButtonStyle.Link && component.url;
						if (isLinkButton) {
							const matchedType = socialTypes.find((type) => label.includes(type));
							if (matchedType) {
								foundSocials.push({
									label: component.label,
									url: component.url,
									emoji: component.emoji || null,
									type: matchedType
								});
							}
						}
					}
				}
			}
		}
		return foundSocials;
	}

	extractControlRows(components) {
		const controlRows = [];
		for (const component of components) {
			if (component.type === Discord.ComponentType.ActionRow) {
				const hasControlButtons = component.components.some((btn) =>
					[
						'setservername',
						'setserverdescription',
						'setservericon',
						'setserverlink',
						'setservercategory',
						'setserverip',
						'addsocial',
						'submitserver',
						'cancelserver',
						'byfivemisrael'
					].includes(btn.customId)
				);
				if (hasControlButtons) {
					controlRows.push(component);
				}
			}
		}
		return controlRows;
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'setservericon') return this.none();
		return this.some();
	}
}

module.exports = {
	ButtonHandler
};
