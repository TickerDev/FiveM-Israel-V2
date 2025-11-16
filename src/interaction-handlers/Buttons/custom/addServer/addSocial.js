const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const Discord = require('discord.js');
const { ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, SeparatorSpacingSize } = Discord;
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
		this.formattedLink = '';
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	async run(interaction) {
		let socials = this.getSocialButtons(interaction.message.components);

		const translatedSocials = {
			Website: 'אתר',
			Youtube: 'יוטיוב',
			Tiktok: 'טיקטוק'
		};

		const selectMenu = new Discord.StringSelectMenuBuilder().setCustomId('social_select').setPlaceholder('Add a social media link');

		const allSocialTypes = ['website', 'youtube', 'tiktok'];
		const existingSocialTypes = socials.map((social) => social.type);
		const missingSocialTypes = allSocialTypes.filter((type) => !existingSocialTypes.includes(type));

		let optionsToAdd = [];

		if (socials.length > 0 && missingSocialTypes.length > 0) {
			if (missingSocialTypes.length === 1) {
				const missingType = missingSocialTypes[0];
				const capitalizedMissingType = missingType.charAt(0).toUpperCase() + missingType.slice(1);
				optionsToAdd.push({
					label: `Add ${capitalizedMissingType}`,
					value: missingType,
					emoji: this.getSocialEmoji(missingType)
				});
			} else {
				missingSocialTypes.forEach((missingType) => {
					const capitalizedMissingType = missingType.charAt(0).toUpperCase() + missingType.slice(1);
					const label = translatedSocials[capitalizedMissingType];
					if (label) {
						optionsToAdd.push({
							label: label,
							value: missingType,
							emoji: this.getSocialEmoji(missingType)
						});
					} else {
						console.warn(`ButtonHandler/addSocial: Missing translation for ${capitalizedMissingType}`);
					}
				});
			}
		} else if (socials.length === 0) {
			allSocialTypes.forEach((type) => {
				const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
				const label = translatedSocials[capitalizedType];
				if (label) {
					optionsToAdd.push({
						label: label,
						value: type,
						emoji: this.getSocialEmoji(type)
					});
				} else {
					console.warn(`ButtonHandler/addSocial: Missing translation for ${capitalizedType}`);
				}
			});
		}

		if (optionsToAdd.length > 0) {
			selectMenu.addOptions(optionsToAdd);
		} else {
			await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
			return interaction.editReply({
				content: 'הוספת את כל הרשתות החברתיות או שלא ניתן להוסיף כרגע.'
			});
		}

		const row = new Discord.ActionRowBuilder().addComponents(selectMenu);

		await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
		const msg = await interaction.editReply({
			content: 'בחר רשת חברתית',
			components: [row]
		});

		const collector = msg.createMessageComponentCollector({
			componentType: Discord.ComponentType.StringSelect,
			time: 3_600_000,
			filter: (i) => i.customId == 'social_select'
		});

		collector.on('collect', async (i) => {
			const selection = i.values[0];
			console.log(i.values[0]);
			const modal = new Discord.ModalBuilder()
				.setCustomId(`social_modal_${selection}`)
				.setTitle(`Add ${selection.charAt(0).toUpperCase() + selection.slice(1)} Link`);

			const linkInput = new Discord.TextInputBuilder()
				.setCustomId('social_link')
				.setLabel(`Enter ${selection.charAt(0).toUpperCase() + selection.slice(1)} Link`)
				.setStyle(Discord.TextInputStyle.Short)
				.setPlaceholder('https://www.example.com')
				.setRequired(true)
				.setMinLength(5)
				.setMaxLength(200);

			const firstActionRow = new Discord.ActionRowBuilder().addComponents(linkInput);
			modal.addComponents(firstActionRow);

			await i.showModal(modal);

			try {
				const modalResponse = await i.awaitModalSubmit({
					filter: (modalInteraction) => modalInteraction.customId === `social_modal_${selection}`,
					time: 300_000
				});

				const link = modalResponse.fields.getTextInputValue('social_link');

				if (!this.isValidLink(link, selection)) {
					await modalResponse.deferReply({ flags: Discord.MessageFlags.Ephemeral });
					await modalResponse.editReply({
						content: `הקישור שהוזן אינו חוקי. קישור חייב להיות מהסוג **${translatedSocials[selection.charAt(0).toUpperCase() + selection.slice(1)]}**`
					});
					return;
				}
				if (selection == 'website' && this.isAdultWebsite(link)) {
					await modalResponse.deferReply({ flags: Discord.MessageFlags.Ephemeral });
					await modalResponse.editReply({
						content: `ווטאפ ברו?📸\n זה בסדר להיות בתקופת יובש, אבל עד כדי כך?`
					});
					return;
				}
				const formattedLink = this.formattedLink;

				const originalComponents = interaction.message.components;
				let socialButton;
				switch (selection) {
					case 'website':
						socialButton = new Discord.ButtonBuilder()
							.setEmoji(config.emojis.website)
							.setLabel('Our Website')
							.setStyle(Discord.ButtonStyle.Link)
							.setURL(formattedLink);
						break;
					case 'youtube':
						socialButton = new Discord.ButtonBuilder()
							.setEmoji(config.emojis.youtube)
							.setLabel('Our Youtube')
							.setStyle(Discord.ButtonStyle.Link)
							.setURL(formattedLink);
						break;
					case 'tiktok':
						socialButton = new Discord.ButtonBuilder()
							.setEmoji(config.emojis.tiktok)
							.setLabel('Our TikTok')
							.setStyle(Discord.ButtonStyle.Link)
							.setURL(formattedLink);
						break;
				}

				const votes = new Discord.ButtonBuilder()
					.setCustomId('votes_display')
					.setLabel('0')
					.setDisabled(true)
					.setStyle(Discord.ButtonStyle.Secondary);

				const existingButtons = this.extractLinkButtons(originalComponents);
				const joinButtonData = existingButtons.find((button) => button.label === 'Join Here');

				const join = new Discord.ButtonBuilder()
					.setEmoji(config.emojis.discord)
					.setLabel('Join Here')
					.setStyle(Discord.ButtonStyle.Link)
					.setURL(joinButtonData?.url || 'https://discord.gg/6xwuYRPzd4');

				const VoteButton = new Discord.ButtonBuilder()
					.setLabel('Vote Server')
					.setCustomId('voteforserver')
					.setEmoji(config.emojis.checkmark)
					.setDisabled(true)
					.setStyle(Discord.ButtonStyle.Secondary);

				const ServerOwnerOptions = new Discord.ButtonBuilder()
					.setLabel('Options')
					.setCustomId('owneroptions')
					.setEmoji(config.emojis.loading)
					.setDisabled(true)
					.setStyle(Discord.ButtonStyle.Secondary);

				const currentSocialButtons = this.getSocialButtons(originalComponents);
				const socialButtonBuilders = [];

				currentSocialButtons.forEach((social) => {
					if (social.type === 'website') {
						socialButtonBuilders.push(
							new Discord.ButtonBuilder()
								.setEmoji(config.emojis.website)
								.setLabel(social.label || 'Our Website')
								.setStyle(Discord.ButtonStyle.Link)
								.setURL(social.url)
						);
					} else if (social.type === 'youtube') {
						socialButtonBuilders.push(
							new Discord.ButtonBuilder()
								.setEmoji(config.emojis.youtube)
								.setLabel(social.label || 'Our Youtube')
								.setStyle(Discord.ButtonStyle.Link)
								.setURL(social.url)
						);
					} else if (social.type === 'tiktok') {
						socialButtonBuilders.push(
							new Discord.ButtonBuilder()
								.setEmoji(config.emojis.tiktok)
								.setLabel(social.label || 'Our TikTok')
								.setStyle(Discord.ButtonStyle.Link)
								.setURL(social.url)
						);
					}
				});

				const existingSocialTypesInMessage = socialButtonBuilders
					.map((sb) => {
						if (sb.data.label.toLowerCase().includes('website')) return 'website';
						if (sb.data.label.toLowerCase().includes('youtube')) return 'youtube';
						if (sb.data.label.toLowerCase().includes('tiktok')) return 'tiktok';
						return null;
					})
					.filter(Boolean);

				if (socialButton && !existingSocialTypesInMessage.includes(selection)) {
					socialButtonBuilders.push(socialButton);
				}
				const socialOrder = { youtube: 3, tiktok: 2, website: 1 };
				socialButtonBuilders.sort((a, b) => {
					const typeA = allSocialTypes.find((t) => a.data.label.toLowerCase().includes(t));
					const typeB = allSocialTypes.find((t) => b.data.label.toLowerCase().includes(t));
					return (socialOrder[typeA] || 99) - (socialOrder[typeB] || 99);
				});

				const SocialRow = socialButtonBuilders.length > 0 ? new Discord.ActionRowBuilder().addComponents(socialButtonBuilders) : null;

				const imageUrl = this.findImageUrl(originalComponents);
				const { title, description } = this.extractTitleAndDescription(originalComponents);
				const categoryInfo = this.extractCategoryInfo(originalComponents);

				const server = await this.container.client.db.getServer(interaction.channelId);
				const isVerified = server ? server.verified : false;

				const titlePrefix = isVerified ? config.emojis.verified : '';
				const displayTitle = title ? `# ${titlePrefix} ${title.replace('# ', '')}` : '# שם השרת שלך';

				const container = new ContainerBuilder()
					.setAccentColor(Discord.Colors.Blurple)
					.addSectionComponents(
						new SectionBuilder()
							.addTextDisplayComponents(new TextDisplayBuilder().setContent(displayTitle))
							.setThumbnailAccessory(
								new ThumbnailBuilder().setURL(imageUrl || `https://${config.r2.customDomain}/static/defaultserverimage.png`)
							)
							.addTextDisplayComponents(
								new TextDisplayBuilder().setContent(description || 'שרת אלווליסט בעל רמת תכנות ורולפליי מהגבוהות ביותר שניתן להציע')
							)
					)
					.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
					.addSectionComponents(
						new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('## Votes')).setButtonAccessory(votes)
					)
					.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(SeparatorSpacingSize.Large));

				if (SocialRow) {
					container.addActionRowComponents(SocialRow);
					container.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
				}
				container.addActionRowComponents(new Discord.ActionRowBuilder().setComponents([join, VoteButton, ServerOwnerOptions]));

				if (categoryInfo) {
					container.addTextDisplayComponents(new TextDisplayBuilder().setContent(categoryInfo));
				}

				const controlRows = this.extractControlRows(originalComponents);

				const componentsToSend = [container, ...controlRows];

				await interaction.message.edit({
					flags: Discord.MessageFlags.IsComponentsV2,
					components: componentsToSend
				});

				await modalResponse.reply({
					content: `נוסף ${this.getTranslatedSocialName(selection)} בהצלחה!`,
					flags: Discord.MessageFlags.Ephemeral
				});

				collector.stop();
			} catch (error) {
				console.error('Modal interaction error:', error);
				if (
					error.code === 'InteractionCollectorError' ||
					error.message === 'Collector received no interactions before ending with reason: time' ||
					(error.name === 'Error' && error.message.includes('ModalSubmitInteraction'))
				) {
					if (!i.replied && !i.deferred) {
						await i
							.followUp({
								content: 'הפעולה נכשלה בשל זמן ארוך מדי. נסה שוב.',
								flags: Discord.MessageFlags.Ephemeral
							})
							.catch((e) => console.error('Error sending followUp for timeout:', e));
					} else {
						console.log('Modal timed out, but interaction was already handled.');
					}
				} else if (!i.replied && !i.deferred && error.code !== 'InteractionAlreadyReplied') {
					await i
						.followUp({
							content: 'אירעה שגיאה בעת עיבוד הבקשה.',
							flags: Discord.MessageFlags.Ephemeral
						})
						.catch((e) => console.error('Error sending followUp for general error:', e));
				}
			}
		});

		collector.on('end', async (collected, reason) => {
			if (reason === 'time' && collected.size === 0) {
				try {
					if (interaction.channel && !interaction.ephemeral) {
						const originalMsg = await interaction.fetchReply().catch(() => null);
						if (originalMsg) {
							await interaction.editReply({
								content: 'פג תוקף הבחירה של רשת חברתית. נסה שוב.',
								components: []
							});
						}
					}
				} catch (error) {
					if (error.code !== 10008 && error.code !== 'InteractionAlreadyReplied') {
						console.error('Failed to edit expired select menu reply:', error);
					}
				}
			}
		});
	}

	extractCategoryInfo(components) {
		for (const component of components) {
			if (component.type === Discord.ComponentType.Container) {
				for (const textDisplay of component.components || []) {
					if (textDisplay.type === Discord.ComponentType.TextDisplay) {
						const content = textDisplay.content;
						if (content && content.startsWith('-# Category:')) {
							return content;
						}
					}
				}
			}
		}
		return null;
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

	isValidLink(link, type) {
		if (link.startsWith('http://')) {
			link = 'https://' + link.substring(7);
		} else if (!link.startsWith('https://')) {
			link = 'https://' + link;
		}

		try {
			new URL(link);
		} catch (e) {
			return false;
		}

		switch (type) {
			case 'youtube':
				this.formattedLink = link;
				return link.includes('youtube.com/') || link.includes('youtu.be/');
			case 'tiktok':
				this.formattedLink = link;
				return link.includes('tiktok.com/');
			case 'website':
				this.formattedLink = link;
				return true;
			default:
				return false;
		}
	}
	isAdultWebsite(link) {
		if (link.startsWith('http://')) {
			link = 'https://' + link.substring(7);
		} else if (!link.startsWith('https://')) {
			link = 'https://' + link;
		}

		const blacklistedDomains = [
			'pornhub.com',
			'xvideos.com',
			'xnxx.com',
			'redtube.com',
			'youporn.com',
			'xhamster.com',
			'onlyfans.com',
			'adultfriendfinder.com',
			'livejasmin.com',
			'brazzers.com',
			'chaturbate.com',
			'myfreecams.com',
			'bongacams.com',
			'adult',
			'xxx',
			'porn',
			'sex',
			'nude',
			'gambling',
			'casino',
			'bet365',
			't.me',
			'telegram',
			'stripchat',
			'mega.nz',
			'dox',
			'doxbin'
		];

		const url = new URL(link);
		if (blacklistedDomains.some((domain) => url.hostname.includes(domain) || url.hostname.split('.').some((part) => domain === part))) {
			return true;
		}
		return false;
	}
	getTranslatedSocialName(type) {
		const translations = {
			youtube: 'יוטיוב',
			tiktok: 'טיקטוק',
			website: 'אתר'
		};
		return translations[type] || type;
	}

	extractLinkButtons(components) {
		const buttons = [];

		for (const container of components) {
			if (container.type === Discord.ComponentType.ActionRow) {
				for (const component of container.components || []) {
					if (component.type === Discord.ComponentType.Button) {
						buttons.push(component);
					}
				}
			}
		}

		return buttons;
	}

	findImageUrl(components) {
		for (const component of components) {
			if (component.type === Discord.ComponentType.Container) {
				for (const section of component.components || []) {
					if (
						section.type === Discord.ComponentType.Section &&
						section.accessory &&
						section.accessory.type === Discord.ComponentType.Thumbnail
					) {
						return section.accessory.media?.url;
					}
				}
			}
		}
		return null;
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

	getSocialEmoji(type) {
		switch (type) {
			case 'youtube':
				return config.emojis.youtube;
			case 'tiktok':
				return config.emojis.tiktok;
			case 'website':
				return config.emojis.website;
			default:
				return null;
		}
	}

	getSocialButtons(components) {
		const socialTypes = ['youtube', 'tiktok', 'website'];
		const foundSocials = [];

		for (const container of components) {
			for (const section of container.components ?? []) {
				if (section.type === Discord.ComponentType.ActionRow) {
					for (const component of section.components ?? []) {
						const label = component.label?.toLowerCase() ?? '';
						console.log(component.emoji?.name);
						const emojiName = component.emoji?.name?.toLowerCase() ?? '';
						const isLinkButton =
							component.type === Discord.ComponentType.Button && component.style === Discord.ButtonStyle.Link && component.url;

						if (isLinkButton) {
							const matchedType = socialTypes.find((type) => label.includes(type));

							if (matchedType) {
								foundSocials.push({
									label: component.label,
									url: component.url,
									emoji: component.emoji?.name,
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

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'addsocial') return this.none();
		return this.some();
	}
}
module.exports = {
	ButtonHandler
};
