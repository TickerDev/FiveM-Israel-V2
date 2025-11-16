const { Command } = require('@sapphire/framework');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
class UserCommand extends Command {
	/**
	 * @param {Command.LoaderContext} context
	 */
	constructor(context) {
		super(context, {
			name: 'setfaj',
			preconditions: ['OwnerOnly']
		});
	}

	/**
	 * @param {import('discord.js').Message} message
	 */
	async messageRun(message) {
		const msg = await message.channel.send({
			embeds: [
				new EmbedBuilder()
					.setDescription(
						`**במידה ואתם מציעים את עצמכם לעבודה \n לחצו על \`מחפש עבודה\`\nבמידה ואתם מחפשים מישהו לעבודה \n לחצו על \`דרוש\`**`
					)
					.setColor(config.embed_color)
					.setAuthor({ name: `${config.serverName} - Find-a-job`, iconURL: message.guild.iconURL() })
					.setThumbnail(message.guild.iconURL())
					.setFooter({ text: `©️ ${config.serverName} 2025-2026`, iconURL: message.guild.iconURL() })
			],
			components: [
				new ActionRowBuilder().setComponents([
					new ButtonBuilder().setCustomId('lookingforjob').setLabel('מחפש עבודה').setStyle(ButtonStyle.Primary),
					new ButtonBuilder().setCustomId('wanted').setLabel('דרוש').setStyle(ButtonStyle.Success)
				])
			]
		});
	}
}

module.exports = {
	UserCommand
};
