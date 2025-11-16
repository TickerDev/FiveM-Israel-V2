const { Listener } = require('@sapphire/framework');
const { prisma } = require('../prisma');
const config = require('../config');
class UserEvent extends Listener {
	/**
	 * @param {Listener.LoaderContext} context
	 */
	constructor(context) {
		super(context, {
			// Any Listener options you want here
		});
	}

	async run(member) {
		if (!member) return;
		const user = await prisma.users.findUnique({
			where: {
				id: member.id
			}
		});
		if (!user) {
			await prisma.users.create({
				data: {
					id: member.id
				}
			});
		}
		await member.roles.add(config.NewUserRole);
	}
}

module.exports = {
	UserEvent
};
