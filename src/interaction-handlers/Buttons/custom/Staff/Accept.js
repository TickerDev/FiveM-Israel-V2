const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const config = require('../../../../config');
const {
	Client,
	GatewayIntentBits,
	UserSelectMenuBuilder,
	Collection,
	ApplicationCommandOptionType,
	ActivityType,
	EmbedBuilder,
	PermissionsBitField,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	ChannelType,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	CommandInteraction,
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	SeparatorSpacingSize,
	MessageFlags
} = require('discord.js');
const Discord = require('discord.js');
const { client } = require('../../../../index.js');
const { prisma } = require('../../../../prisma');

class TicketAddButtonHandler extends InteractionHandler {
	constructor(ctx, options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	/**
	 * Extract category from channel topic
	 */
	extractCategoryFromTopic(channelTopic) {
		if (!channelTopic) return null;
		const match = channelTopic.match(/\(([^)]+)\)/);
		return match ? match[1] : null;
	}

	/**
	 * Extract message ID from channel topic
	 */
	extractMessageIdFromTopic(channelTopic) {
		if (!channelTopic) return null;
		const parts = channelTopic.split(' ');
		return parts[0] || null;
	}

	/**
	 * Extract data from Components V2 message
	 */
	extractDataFromComponents(components) {
		let title = null;
		let description = null;
		let imageUrl = null;
		let link = null;
		let votes = 0;

		for (const component of components) {
			if (component.type === Discord.ComponentType.Container) {
				for (const section of component.components || []) {
					if (section.type === Discord.ComponentType.Section) {
						if (section.accessory?.type === Discord.ComponentType.Thumbnail) {
							imageUrl = section.accessory.media?.url;
						}

						if (section.accessory?.type === Discord.ComponentType.Button && section.accessory.customId === 'votes_display') {
							votes = parseInt(section.accessory.label) || 0;
						}

						for (const textComponent of section.components || []) {
							if (textComponent.type === Discord.ComponentType.TextDisplay) {
								const content = textComponent.content;
								if (content.startsWith('# ')) {
									title = content.replace('# ', '');
								} else if (!content.startsWith('#') && !content.startsWith('-#') && !title) {
									description = content;
								} else if (!description && title && !content.startsWith('#') && !content.startsWith('-#')) {
									description = content;
								}
							}
						}
					}

					if (section.type === Discord.ComponentType.ActionRow) {
						for (const btn of section.components || []) {
							if (btn.type === Discord.ComponentType.Button && btn.style === Discord.ButtonStyle.Link && btn.label === 'Join Here') {
								link = btn.url;
							}
						}
					}
				}
			}
		}

		return { title, description, imageUrl, link, votes };
	}

	/**
	 * Get owner ID from channel permissions
	 */
	getOwnerIdFromChannel(channel) {
		const permissions = channel.permissionOverwrites.cache;
		for (const [id, permission] of permissions) {
			if (id !== channel.guild.roles.everyone.id && permission.allow.has('ViewChannel')) {
				return id;
			}
		}
		return null;
	}

	/**
	 * Extract social buttons from Components V2 message
	 */
	extractSocialButtons(components) {
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
	 * Extract blacklist data from Components V2 message or embeds
	 * This extracts name, blacklistId, reason, and evidence from ticket messages
	 */
	extractBlacklistData(message) {
		const data = {
			name: null,
			blacklistId: null,
			reason: null,
			evidence: null,
			evidence2: null
		};

		if (message.embeds && message.embeds.length > 0) {
			const embed = message.embeds[0];
			if (embed.fields) {
				for (const field of embed.fields) {
					if (field.name.includes('מקבל הבלאקליסט') || field.name.includes('Name')) {
						data.name = field.value.replace('<@', '').replace('>', '');
					} else if (field.name.includes('איידי') || field.name.includes('ID')) {
						data.blacklistId = field.value.replace('<@', '').replace('>', '');
					} else if (field.name.includes('סיבה') || field.name.includes('Reason')) {
						data.reason = field.value;
					} else if (field.name.includes('הוכחה') || field.name.includes('Evidence')) {
						const urls = field.value.match(/\[.*?\]\((.*?)\)/g);
						if (urls && urls.length > 0) {
							data.evidence = urls[0].match(/\((.*?)\)/)[1];
							if (urls.length > 1) {
								data.evidence2 = urls[1].match(/\((.*?)\)/)[1];
							}
						}
					}
				}
			}
		}

		if (message.components) {
			for (const component of message.components) {
				if (component.type === Discord.ComponentType.Container) {
					for (const section of component.components || []) {
						if (section.type === Discord.ComponentType.Section) {
							for (const textComponent of section.components || []) {
							if (textComponent.type === Discord.ComponentType.TextDisplay) {
								const content = textComponent.content;
								if (content.includes('שם:') || content.includes('Name:')) {
										const nameMatch = content.match(/(?:שם:|Name:)\s*(.+)/);
										if (nameMatch) data.name = nameMatch[1].trim();
									}
									if (content.includes('ID:')) {
										const idMatch = content.match(/ID:\s*(.+)/);
										if (idMatch) data.blacklistId = idMatch[1].trim();
									}
									if (content.includes('סיבה:') || content.includes('Reason:')) {
										const reasonMatch = content.match(/(?:סיבה:|Reason:)\s*(.+)/);
										if (reasonMatch) data.reason = reasonMatch[1].trim();
									}
								}
							}
						}
					}
				}
			}
		}

		return data;
	}

	parse(interaction) {
		if (interaction.customId !== 'accept') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		const { guild } = interaction;

		if (!interaction.member.roles.cache.has(config.staffRole))
			return interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral }).then(() =>
				interaction.editReply({
					content: 'אין לך גישה לזה!'
				})
			);

		if (interaction.channel.parentId == config.tickets.addServers) {
			if (String(interaction.channel.name).includes('עריכת-שרת')) {
				await interaction.deferReply();

				// Get owner ID from channel permissions
				const ownerId = this.getOwnerIdFromChannel(interaction.channel);
				if (!ownerId) {
					return interaction.editReply('Could not find the server owner from channel permissions.');
				}

				const messageId = this.extractMessageIdFromTopic(interaction.channel.topic);
				if (!messageId) {
					return interaction.editReply('Could not find the message ID from channel topic.');
				}

				const ticketMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);
				if (!ticketMessage) {
					return interaction.editReply('Could not find the ticket message.');
				}

				const ticketData = this.extractDataFromComponents(ticketMessage.components);
				const socialButtons = this.extractSocialButtons(ticketMessage.components);
				const serverwhattype = this.extractCategoryFromTopic(interaction.channel.topic)?.toLowerCase()?.trim();

				if (!ticketData.title || !ticketData.description || !ticketData.imageUrl || !ticketData.link || !serverwhattype) {
					return interaction.editReply('Could not extract all required data from the ticket message.');
				}

				const serverChannelId = interaction.channel.topic.substring(interaction.channel.topic.indexOf("[") + 1, interaction.channel.topic.indexOf("]"));
				console.log('Server Channel ID from topic:', serverChannelId);

				const ticketServer = await prisma.servers.findUnique({
					where: { channelID: serverChannelId }
				});

				if (!ticketServer) {
					return interaction.editReply('Could not find the specific server being edited.');
				}
				const serverchannel = serverChannelId;
				const servername = String(ticketData.title);
				const servermsg = String(ticketServer.messageId);
				const serverdescription = String(ticketData.description);
				const serverimg = String(ticketData.imageUrl);
				const serverinvite = String(ticketData.link);
				const serverowner = String(ownerId);
				const channel1 = guild.channels.cache.get(serverchannel);

				if (!channel1) {
					return interaction.editReply("Oh no! seems like I cannot trace the server's channel, does it exist?");
				}

				const votes = ticketServer.votes;

				const message1 = await channel1.messages.fetch(servermsg).catch(() => null);
				if (!message1) {
					return interaction.editReply('Could not find the server message in the server channel.');
				}

				const member = interaction.guild.members.cache.find((x) => x.id == ownerId);
				if (member && member.permissions.bitfield < interaction.guild.members.me.permissions.bitfield) {
					await member.setNickname(`${servername} | ${member.user.displayName}`).catch((err) => []);
				}

				const channelCategory = config.categories.find((x) => x.parentId == channel1.parentId);
				const serverCategory = config.categories.find((x) => x.type == String(serverwhattype).toLowerCase());

				if (channelCategory.type !== serverwhattype) {
					channel1.setParent(serverCategory.parentId);
					channel1.permissionOverwrites.create(interaction.guild.roles.everyone, {
						ViewChannel: false,
						SendMessages: false
					});
					channel1.permissionOverwrites.create(config.memberRole, {
						ViewChannel: true,
						SendMessages: false
					});
				}

				const sanitizedServerName = servername.replace(config.emojis.verified, '').replace(/\s+/g, ' ').trim();

				const titlePrefix = ticketServer.verified ? config.emojis.verified : '';
				const displayTitle = `# ${titlePrefix} ${sanitizedServerName}`;

				const votesButton = new Discord.ButtonBuilder()
					.setCustomId('votes_display')
					.setLabel(String(votes))
					.setDisabled(true)
					.setStyle(Discord.ButtonStyle.Secondary);

				const container = new Discord.ContainerBuilder()
					.setAccentColor(Discord.Colors.Blurple)
					.addSectionComponents(
						new Discord.SectionBuilder()
							.addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent(displayTitle))
							.setThumbnailAccessory(new Discord.ThumbnailBuilder().setURL(serverimg))
							.addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent(serverdescription))
					)
					.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(Discord.SeparatorSpacingSize.Large))
					.addSectionComponents(
						new Discord.SectionBuilder()
							.addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent('## Votes'))
							.setButtonAccessory(votesButton)
					)
					.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(Discord.SeparatorSpacingSize.Large));

				const VoteButton = new Discord.ButtonBuilder()
					.setLabel('Vote Server')
					.setCustomId('voteforserver')
					.setEmoji(config.emojis.checkmark)
					.setStyle(Discord.ButtonStyle.Primary);

				const ServerOwnerOptions = new Discord.ButtonBuilder()
					.setLabel('Options')
					.setCustomId('owneroptions')
					.setEmoji(config.emojis.loading)
					.setStyle(Discord.ButtonStyle.Primary);

				const join = new Discord.ButtonBuilder()
					.setEmoji(config.emojis.discord)
					.setLabel('Join Here')
					.setStyle(Discord.ButtonStyle.Link)
					.setURL(serverinvite);

				// Add social buttons if they exist
				if (socialButtons.length > 0) {
					const socialButtonBuilders = [];
					socialButtons.forEach((social) => {
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

					// Sort social buttons for consistent order
					const socialOrder = { youtube: 3, tiktok: 2, website: 1 };
					socialButtonBuilders.sort((a, b) => {
						const typeA = ['youtube', 'tiktok', 'website'].find((t) => a.data.label.toLowerCase().includes(t));
						const typeB = ['youtube', 'tiktok', 'website'].find((t) => b.data.label.toLowerCase().includes(t));
						return (socialOrder[typeA] || 99) - (socialOrder[typeB] || 99);
					});

					container.addActionRowComponents(new Discord.ActionRowBuilder().addComponents(socialButtonBuilders));
					container.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(Discord.SeparatorSpacingSize.Small));
				}

				container.addActionRowComponents(new Discord.ActionRowBuilder().setComponents([join, VoteButton, ServerOwnerOptions]));

				const message = await message1.edit({
					components: [container],
					content: '',
					flags: Discord.MessageFlags.IsComponentsV2
				});

				const updatedServer = await client.db.updateServer(channel1.id, {
					category: serverwhattype.toLowerCase().trim(),
					name: sanitizedServerName,
					description: serverdescription,
					image: serverimg,
					invite: serverinvite,
					messageId: message.id
				});

				if (!updatedServer) {
					return await interaction.editReply('Something went wrong, please try again later.');
				}

				const newChannel = guild.channels.cache.find((x) => x.id == channel1.id);
				await channel1.setName(`${newChannel.position + 1}. ${sanitizedServerName}`);

				const SuccessEmbed = new Discord.EmbedBuilder()
					.setColor('Green')
					.setDescription(`הבקשה שלך אושרה על ידי <@${interaction.user.id}>, כל השינויים נשמרו ב <#${channel1.id}>`);

				await interaction.editReply({
					embeds: [SuccessEmbed]
				});

				return;
			}
			if (interaction.channel.name.includes('מחיקה')) {
				const { channel, guild } = interaction;

				const ownerId = this.getOwnerIdFromChannel(interaction.channel);
				if (!ownerId) {
					await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
					return interaction.editReply('Could not find the server owner from channel permissions.');
				}

				const serverChannelId = interaction.channel.topic.substring(interaction.channel.topic.indexOf("[") + 1, interaction.channel.topic.indexOf("]"));
				console.log('Server Channel ID from deletion topic:', serverChannelId);

				const ticketServer = await client.db.prisma.servers.findUnique({
					where: { channelID: serverChannelId }
				});

				if (!ticketServer) {
					await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
					return interaction.editReply('Could not find the specific server to delete.');
				}
				const channel1 = interaction.guild.channels.cache.find((x) => x.id == String(ticketServer.channelID));

				if (channel1 == null || channel1 == undefined) {
					await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
					return interaction.editReply({
						content: "Couldn't find server room."
					});
				}

				const member = interaction.guild.members.cache.find((x) => x.id == ownerId);

				if (member) {
					try {
						if (interaction.member.permissions.bitfield < interaction.guild.members.me.permissions.bitfield) {
							await member.setNickname(`${member.user.username}`);
						}
					} catch (error) {
						await interaction.reply({
							content: "couldn't change owner's name"
						});
					}

					if (member.roles.cache.has(config.OwnerRole)) {
						await member.roles.remove(config.OwnerRole);
					}
				}

				await client.db.deleteServer(channel1.id);
				await channel1.delete();

				const SuccessEmbed = new Discord.EmbedBuilder()
					.setColor('Green')
					.setDescription(`הבקשה שלך אושרה על ידי <@${interaction.user.id}> והחדר נמחק.`);

				return interaction.reply({
					embeds: [SuccessEmbed]
				});
			}

			if (interaction.channel.name.includes('בניית')) {
				// Get owner ID from channel permissions
				const ownerId = this.getOwnerIdFromChannel(interaction.channel);
				if (!ownerId) {
					return interaction.reply('Could not find the server owner from channel permissions.');
				}

				// Get message ID from channel topic
				const messageId = this.extractMessageIdFromTopic(interaction.channel.topic);
				if (!messageId) {
					return interaction.reply('Could not find the message ID from channel topic.');
				}

				// Fetch the Components V2 message from the ticket channel
				const ticketMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);
				if (!ticketMessage) {
					return interaction.reply('Could not find the ticket message.');
				}

				const ticketData = this.extractDataFromComponents(ticketMessage.components);
				const socialButtons = this.extractSocialButtons(ticketMessage.components);
				const categoryType = this.extractCategoryFromTopic(interaction.channel.topic)?.toLowerCase()?.trim();

				if (!ticketData.title || !ticketData.description || !ticketData.imageUrl || !ticketData.link || !categoryType) {
					return interaction.reply('Could not extract all required data from the ticket message. Please ensure all fields are filled.');
				}

				const member = interaction.guild.members.cache.get(ownerId);
				if (!member) {
					return interaction.reply('Could not find the server owner member.');
				}

				if (String(ticketData.title).length >= 25) {
					return interaction.reply({
						content: 'Server name cannot be more than 25 characters'
					});
				}

				try {
					if (member.manageable && interaction.user.id !== interaction.guild.ownerId) {
						const sanitizedTitleForNickname = ticketData.title.replace(config.emojis.verified, '').replace(/\s+/g, ' ').trim();
						await member.setNickname(`${sanitizedTitleForNickname} | ${member.user.displayName}`);
						if (!member.roles.cache.has(config.OwnerRole)) {
							await member.roles.add(config.OwnerRole);
						}
					}
				} catch (error) {
					console.error(error);
				}

				let category;
				if (categoryType == 'public') category = config.categories[2].parentId;
				else if (categoryType == 'whitelist') category = config.categories[0].parentId;
				else if (categoryType == 'allowlist') category = config.categories[1].parentId;
				else if (categoryType == 'fun') category = config.categories[3].parentId;
				else if (categoryType == 'shop') category = config.categories[5].parentId;
				else if (categoryType == 'hosting') category = config.categories[4].parentId;
				else return interaction.reply('could not find category!');

				const sanitizedTitleForChannel = ticketData.title.replace(config.emojis.verified, '').replace(/\s+/g, ' ').trim();

				const channel = await interaction.guild.channels.create({
					name: `${sanitizedTitleForChannel}`,
					reason: 'opening a server room',
					parent: category
				});

				// Sanitize verified emoji from server name for channel name
				await channel.setName(`${channel.position + 1}. ${sanitizedTitleForChannel}`);

				channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
					ViewChannel: false,
					SendMessages: false
				});
				channel.permissionOverwrites.edit(config.memberRole, {
					ViewChannel: true,
					SendMessages: false
				});
				// Create Components V2 message for the new server
				const votesButton = new Discord.ButtonBuilder()
					.setCustomId('votes_display')
					.setLabel('0')
					.setDisabled(true)
					.setStyle(Discord.ButtonStyle.Secondary);

				const container = new Discord.ContainerBuilder()
					.setAccentColor(Discord.Colors.Blurple)
					.addSectionComponents(
						new Discord.SectionBuilder()
							.addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent(`# ${ticketData.title}`))
							.setThumbnailAccessory(new Discord.ThumbnailBuilder().setURL(ticketData.imageUrl))
							.addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent(ticketData.description))
					)
					.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(Discord.SeparatorSpacingSize.Large))
					.addSectionComponents(
						new Discord.SectionBuilder()
							.addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent('## Votes'))
							.setButtonAccessory(votesButton)
					)
					.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(Discord.SeparatorSpacingSize.Large));

				const VoteButton = new Discord.ButtonBuilder()
					.setLabel('Vote Server')
					.setCustomId('voteforserver')
					.setEmoji(config.emojis.checkmark)
					.setStyle(Discord.ButtonStyle.Primary);

				const ServerOwnerOptions = new Discord.ButtonBuilder()
					.setLabel('Options')
					.setCustomId('owneroptions')
					.setEmoji(config.emojis.loading)
					.setStyle(Discord.ButtonStyle.Primary);

				const join = new Discord.ButtonBuilder()
					.setEmoji(config.emojis.discord)
					.setLabel('Join Here')
					.setStyle(Discord.ButtonStyle.Link)
					.setURL(ticketData.link);

				// Add social buttons if they exist
				if (socialButtons.length > 0) {
					const socialButtonBuilders = [];
					socialButtons.forEach((social) => {
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

					// Sort social buttons for consistent order
					const socialOrder = { youtube: 3, tiktok: 2, website: 1 };
					socialButtonBuilders.sort((a, b) => {
						const typeA = ['youtube', 'tiktok', 'website'].find((t) => a.data.label.toLowerCase().includes(t));
						const typeB = ['youtube', 'tiktok', 'website'].find((t) => b.data.label.toLowerCase().includes(t));
						return (socialOrder[typeA] || 99) - (socialOrder[typeB] || 99);
					});

					container.addActionRowComponents(new Discord.ActionRowBuilder().addComponents(socialButtonBuilders));
					container.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(Discord.SeparatorSpacingSize.Small));
				}

				container.addActionRowComponents(new Discord.ActionRowBuilder().setComponents([join, VoteButton, ServerOwnerOptions]));
				const SuccessEmbed = new Discord.EmbedBuilder()
					.setColor('Green')
					.setDescription(
						`השרת נוסף בהצלחה לרשימה! ⭐
                            
                         דבר אחרון שנשאר הוא לפרסם את השרת שלנו בעדכונים אצלך,
                         גם על מנת לעזור לנו לגדול, וגם על מנת שתהיה מקום גבוה יותר ברשימה,
                         עזור לנו לאסוף את כל הקהילה הישראלית אלינו ולכוון אותה לעתיד טוב יותר ב${config.serverName}. ❤️
                         
                         
                         ההודעה אשר תפרסם - 🌄
                         אני מזמין אתכם לשרת ה${config.serverName} הארצי.
                         השרת מכיל רשימת שרתים ובין הרשימה נמצא השרת שלנו
                         ככל שנעלה ברשימה ככה השרת שלנו ישתפר, השרת מכיל הגרלות, טיפים ומגוון דברים שיעזרו לכל שחקן או מנהל שרת.
                         קישור תמידי לשרת : https://discord.gg/BhAkSuZ3n6
						 ---------------------------------------------------------------------------------
						 **עכשיו רק נשאר לך לשלוח פה תמונה שפרסמת בשרת שלך שנדע שאתה רשמית איתנו 🙂**
						 ---------------------------------------------------------------------------------
                         \n`
					)
					.setFooter({ text: `אושר על ידי ${interaction.user.displayName}` });

				interaction.channel.send({
					embeds: [SuccessEmbed],
					content: `<#${channel.id}>, <@${member.id}>`
				});
				const logChannel = guild.channels.cache.find((x) => x.id == config.logChannel);
				logChannel.send({
					embeds: [
						new Discord.EmbedBuilder()
							.setTitle('New Server Created')
							.setDescription(`Server: ${ticketData.title} got created by - ${interaction.user.username}`)
							.setColor(config.embed_color)
					]
				});
				const message = await channel.send({
					components: [container],
					flags: Discord.MessageFlags.IsComponentsV2
				});

				const data = await client.db.createServer({
					category: categoryType,
					channelID: channel.id,
					guildID: interaction.guild.id,
					ownerID: member.id,
					moderatorID: interaction.user.id,
					votes: 0,
					name: ticketData.title,
					description: ticketData.description,
					image: ticketData.imageUrl,
					invite: ticketData.link,
					messageId: message.id
				});

				if (!data || !data[0]) return;

				return;

				// This duplicate code section has been removed - the logic above handles server creation
			}
		}
		if (interaction.channel.parentId == config.tickets.blacklist) {
			// Get owner ID (ticket submitter) from channel permissions
			const ownerId = this.getOwnerIdFromChannel(interaction.channel);
			if (!ownerId) {
				return interaction.reply('Could not find the ticket submitter from channel permissions.');
			}

			// Get message ID from channel topic
			const messageId = this.extractMessageIdFromTopic(interaction.channel.topic);
			if (!messageId) {
				return interaction.reply('Could not find the message ID from channel topic.');
			}

			// Fetch the ticket message
			const ticketMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);
			if (!ticketMessage) {
				return interaction.reply('Could not find the ticket message.');
			}

			// Extract blacklist data from the message
			const ticket = this.extractBlacklistData(ticketMessage);

			if (ticket.evidence2 == null || !ticket.evidence2 || ticket.evidence2 == undefined) {
				const user = interaction.guild.members.cache.get(String(ticket.blacklistId));
				if (!user || user == null || user == undefined) {
					const embed = new Discord.EmbedBuilder().setTitle('בלאקליסט חדש!').addFields([
						{
							name: 'מקבל הבלאקליסט:',
							value: `${ticket.name}`
						},
						{
							name: 'איידי של מקבל הבלאקליסט:',
							value: ticket.blacklistId
						},
						{
							name: 'סיבה לטענת מגיש הבלאק ליסט:',
							value: ticket.reason
						},
						{
							name: 'הוכחה/ות:',
							value: `[לחצו פה](${String(ticket.evidence)})`
						}
					]);

					const channel = interaction.guild.channels.cache.get(config.BlackListChannel);
					channel.send({
						embeds: [embed]
					});
					const SuccessEmbed = new Discord.EmbedBuilder()
						.setColor('Green')
						.setDescription(
							`Your blacklist was approved by <@${interaction.user.id}>, and has been sent in <#${config.BlackListChannel}>`
						);
					interaction.reply({
						embeds: [SuccessEmbed]
					});

					return;
				}
				const embed = new Discord.EmbedBuilder().setTitle('!בלאקליסט חדש').addFields([
					{
						name: 'מקבל הבלאקליסט:',
						value: `${ticket.name}`
					},
					{
						name: 'איידי של מקבל הבלאקליסט:',
						value: `<@${ticket.blacklistId}>`
					},
					{
						name: 'סיבה לטענת מגיש הבלאק ליסט:',
						value: ticket.reason
					},
					{
						name: 'הוכחה/ות:',
						value: `[לחצו פה](${String(ticket.evidence)})`
					}
				]);
				await user.roles.add(config.BlackListRole);

				const channel = interaction.guild.channels.cache.get(config.BlackListChannel);
				channel.send({
					embeds: [embed]
				});
				const SuccessEmbed = new Discord.EmbedBuilder()
					.setColor('Green')
					.setDescription(`Your blacklist was approved by <@${interaction.user.id}>, and has been sent in <#${config.BlackListChannel}>`);
				interaction.reply({
					embeds: [SuccessEmbed]
				});

				return;
			}

			const user = interaction.guild.members.cache.get(String(ticket.blacklistId));

			if (!user || user == null || user == undefined) {
				const embed = new Discord.EmbedBuilder().setTitle('!בלאקליסט חדש').addFields([
					{
						name: 'מקבל הבלאקליסט:',
						value: `${ticket.name}`
					},
					{
						name: 'איידי של מקבל הבלאקליסט:',
						value: ticket.blacklistId
					},
					{
						name: 'סיבה לטענת מגיש הבלאק ליסט:',
						value: ticket.reason
					},
					{
						name: 'הוכחה/ות:',
						value: `[לחצו פה](${String(ticket.evidence)}), [לחצו פה](${String(ticket.evidence2)}) `
					}
				]);
				const channel = interaction.guild.channels.cache.get(config.BlackListChannel);
				channel.send({
					embeds: [embed]
				});
				const SuccessEmbed = new Discord.EmbedBuilder()
					.setColor('Green')
					.setDescription(`Your blacklist was approved by <@${interaction.user.id}>, and has been sent in <#${config.BlackListChannel}>`);
				interaction.reply({
					embeds: [SuccessEmbed]
				});

				return;
			}
			const embed = new Discord.EmbedBuilder().setTitle('!בלאקליסט חדש').addFields([
				{
					name: 'מקבל הבלאקליסט:',
					value: `${ticket.name}`
				},
				{
					name: 'איידי של מקבל הבלאקליסט:',
					value: `<@${ticket.blacklistId}>`
				},
				{
					name: 'סיבה לטענת מגיש הבלאק ליסט:',
					value: ticket.reason
				},
				{
					name: 'הוכחה/ות:',
					value: `[לחצו פה](${String(ticket.evidence)}), [לחצו פה](${String(ticket.evidence2)}) `
				}
			]);
			await user.roles.add(config.BlackListRole);
			const channel = interaction.guild.channels.cache.get(config.BlackListChannel);
			channel.send({
				embeds: [embed]
			});
			const SuccessEmbed = new Discord.EmbedBuilder()
				.setColor('Green')
				.setDescription(`Your blacklist was approved by <@${interaction.user.id}>, and has been sent in <#${config.BlackListChannel}>`);
			interaction.reply({
				embeds: [SuccessEmbed]
			});
		}
	}
}
module.exports = {
	TicketAddButtonHandler
};
