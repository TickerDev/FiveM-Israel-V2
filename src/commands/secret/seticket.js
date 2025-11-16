const { Command } = require('@sapphire/framework');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
class UserCommand extends Command {
	/**
	 * @param {Command.LoaderContext} context
	 */
	constructor(context) {
		super(context, {
			name: 'setticket',
			preconditions: ['OwnerOnly']
		});
	}

	/**
	 * @param {import('discord.js').Message} message
	 */
	async messageRun(message) {
		message.channel.send({
			embeds: [
				new EmbedBuilder()
					.setTitle('Open Ticket')
					.setDescription('Please choose the subject you want to discuss with our staff.')
					.setColor(config.embed_color)
					.setThumbnail(message.guild.iconURL())
					.setFooter({ text: `©️ ${config.serverName} 2025`, iconURL: message.guild.iconURL() })
			],
			components: [
				new ActionRowBuilder().setComponents([
					new ButtonBuilder().setCustomId('addserverbutton').setLabel('Add Your Server').setStyle(ButtonStyle.Primary),
					new ButtonBuilder().setCustomId('getrolesbutton').setLabel('Get Roles').setStyle(ButtonStyle.Primary),
					new ButtonBuilder().setCustomId('generalqustionsbutton').setLabel('General Questions').setStyle(ButtonStyle.Primary),
					new ButtonBuilder().setCustomId('suggestblacklistbutton').setLabel('Blacklist').setStyle(ButtonStyle.Primary),
					new ButtonBuilder().setCustomId('otherbutton').setLabel('Other').setStyle(ButtonStyle.Primary)
				])
			]
		});
	}
}

module.exports = {
	UserCommand
};
