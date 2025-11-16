const { EmbedBuilder, WebhookClient, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const quickDB = require('quick.db');
const webhooks = new quickDB.QuickDB({ table: 'webhooks' });
const serverVotesDb = new quickDB.QuickDB({ table: 'servervotes' });
const seasonDB = new quickDB.QuickDB({ table: 'seasons' });
const cooldowns = new quickDB.QuickDB({ table: 'cooldowns' });
const config = require('../config');
const humanizeDuration = require('humanize-duration');
const { prisma } = require('../prisma');

function humanize(ms) {
	return humanizeDuration(ms, {
		round: true,
		conjunction: ' ו ',
		serialComma: false,
		language: 'he'
	});
}
async function vote(client, interaction) {
	const { user, message, channel } = interaction;
	if (!message) return;
	if (user.bot) return;
	const server = await prisma.servers.findUnique({
		where: {
			channelID: channel.id
		}
	});
	if (!server)
		return await interaction.editReply({
			content: 'השרת לא רשום, פנה לצוות.'
		});
	if ((await seasonDB.get('votes')) == false) return interaction.editReply({ content: 'העונה נגמרה! עליך להמתין שהעונה תתחדש' });

	const cooldown = await cooldowns.get(`${channel.id}.${user.id}`);
	const memberIsBooster = interaction.member.premiumSince;
	const cooldownTime = memberIsBooster ? Number(60 * 60 * 12 * 1000) : Number(60 * 60 * 24 * 1000);
	if (cooldown !== null && cooldownTime - (Date.now() - cooldown) > 0) {
		const timeLeft = cooldown !== null ? cooldownTime - (Date.now() - Number(cooldown)) : 0;
		return await interaction.editReply({
			content: `אתה צריך להמתין **${humanize(timeLeft)}** לפני שתוכל להצביע שוב`
		});
	} else await cooldowns.set(`${channel.id}.${user.id}`, Date.now());
	let amount = 1;
	if (interaction.member.roles.cache.has(config.boosterRole)) amount += 1;
	let newAmount = server.votes + amount;
	await prisma.servers.update({
		where: {
			channelID: channel.id
		},
		data: {
			votes: { increment: amount }
		}
	});
	const updatedComponents = JSON.parse(JSON.stringify(message.components));
	let votesButtonFound = false;

	for (const component of updatedComponents) {
		if (component.type === ComponentType.Container) {
			for (const section of component.components || []) {
				if (section.type === ComponentType.Section) {
					if (section.accessory && section.accessory.type === ComponentType.Button && section.accessory.customId === 'votes_display') {
						section.accessory.label = newAmount.toString();
						votesButtonFound = true;
					}
				}
			}
		} else if (component.type === ComponentType.ActionRow) {
			for (const button of component.components || []) {
				if (button.type === ComponentType.Button && button.customId === 'votes_display') {
					button.label = newAmount.toString();
					votesButtonFound = true;
				}
			}
		}
	}

	if (!votesButtonFound) {
		console.warn(`Could not find votes button in Components V2 message for server ${server.name}`);
	}

	if (votesButtonFound) {
		setTimeout(async () => {
			try {
				await message.edit({ components: updatedComponents });
			} catch (error) {
				console.error(`Failed to update message for server ${server.name}:`, error);
			}
		}, 500);
	}
	var timestampUTC = Date.now();
	var date = new Date(timestampUTC);
	var israelOffset = date.getTimezoneOffset();
	var isDST = israelOffset === -120;

	var israelOffsetMillis = (isDST ? 3 : 2) * 60 * 60 * 1000;

	var timestampIsrael = timestampUTC + israelOffsetMillis;

	if (!(await serverVotesDb.get(channel.id))) {
		await serverVotesDb.set(channel.id, [
			{
				user: interaction.user.id,
				amount: amount,
				date: new Date(timestampIsrael)
			}
		]);
	} else {
		await serverVotesDb.push(channel.id, {
			user: interaction.user.id,
			amount: amount,
			date: new Date(timestampIsrael)
		});
	}
	const channelVoteLog = interaction.guild.channels.cache.get(config.list.voteLogs);
	const embedVoteLog = new EmbedBuilder()
		.setColor(config.embed_color)
		.setDescription(
			`**\`${user.tag}\` just voted for <#${channel.id}>, The ${server.category == 'client' ? 'client' : 'Server'} now has \`${newAmount}\`**`
		);
	if (channelVoteLog) await channelVoteLog.send({ embeds: [embedVoteLog] });
	const webhook = await webhooks.get(interaction.channelId);
	if (webhook) {
		const webhookClient = new WebhookClient({ url: webhook });
		webhookClient.send({
			embeds: [
				new EmbedBuilder()
					.setFooter({ text: `הצבעה מ${config.serverName}`, iconURL: interaction.guild.members.me.displayAvatarURL() })
					.setTitle('!הצבעה חדשה')
					.setDescription(
						`תודה רבה ל ${interaction.user} (\`${interaction.user.displayName}\`) על ההצבעה!<a:sparkles:1203730475449843722>\nבזכותו אנחנו יושבים על **${newAmount} הצבעות!**\nהצביעו לנו גם ב${config.serverName}!`
					)
					.setColor(config.embed_color)
					.setTimestamp()
			],
			avatarURL: interaction.guild.members.me.displayAvatarURL(),
			username: `${config.serverName} - הצבעות`
		});
	}

	return await interaction.editReply({
		content: `הצבעת בהצלחה ל - ** ${server.name}**`
	});
}

module.exports.vote = vote;
