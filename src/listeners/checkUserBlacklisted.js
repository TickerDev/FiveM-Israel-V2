const { Listener } = require('@sapphire/framework');
const { GuildMember } = require('discord.js');

class CheckUserBlacklistedEvent extends Listener {
	constructor(context, options = {}) {
		super(context, {
			name: 'guildMemberAdd',
			...options
		});
	}
	/**
	 * @param {GuildMember} member
	 */
	async run(member) {
		if (!member) return;

		const config = this.container.config;
		const blacklistedData = await this.container.prisma.blacklistRequests
			.findFirst({
				where: {
					blacklistedUserId: member.id
				}
			})
			.catch(() => {});

		if (!blacklistedData) return;

		await member.roles.add(config.BlackListRole, '[Blacklist] The user tried to remove his blacklist role.');
	}
}

module.exports = {
	CheckUserBlacklistedEvent
};
