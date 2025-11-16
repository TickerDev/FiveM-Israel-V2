const { prisma } = require('../prisma');

class Database {
	constructor() { }

	async getServers() {
		try {
			const servers = await prisma.servers.findMany();
			return servers || [];
		} catch (error) {
			console.error('Error fetching servers:', error);
			return [];
		}
	}

	async createServer({
		guildID,
		channelID,
		ownerID,
		moderatorID,
		category,
		votes = 0,
		name,
		description,
		image,
		invite,
		messageId
	}) {
		try {
			const [newServer, logEntry] = await prisma.$transaction([
				prisma.servers.create({
					data: {
						guildID,
						channelID,
						ownerID,
						moderatorID,
						category,
						votes,
						name,
						description,
						image,
						invite,
						messageId,
					},
				}),
				prisma.logs.create({
					data: {
						action: 'CREATE_SERVER',
						details: `Server '${name}' created with guildID '${guildID}'.`,
					},
				}),
			]);
			return newServer;
		} catch (error) {
			console.error('Error creating server:', error);
			throw new Error('Failed to create server in the database.');
		}
	}

	async deleteServer(channelID) {
		try {
			const [deletedServer, logEntry] = await prisma.$transaction([
				prisma.servers.delete({
					where: { channelID },
				}),
				prisma.logs.create({
					data: {
						action: 'DELETE_SERVER',
						details: `Server with channelID '${channelID}' was deleted.`,
					},
				}),
			]);
			return deletedServer;
		} catch (error) {
			console.error('Error deleting server:', error);
			return false;
		}
	}

	async getServer(channelID) {
		try {
			const server = await prisma.servers.findUnique({
				where: { channelID },
			});
			return server || null;
		} catch (error) {
			console.error('Error fetching server:', error);
			return null;
		}
	}
	async resetGlobalVotes() {
		try {
			const result = await prisma.servers.updateMany({
				data: { votes: 0 },
			});
			return result;
		} catch (error) {
			console.error('Error resetting global votes:', error);
			return false;
		}
	}
	async getServerByGuildId(guildID) {
		try {
			const server = await prisma.servers.findFirst({
				where: { guildID },
			});
			return server || null;
		} catch (error) {
			console.error('Error fetching server by guild ID:', error);
			return null;
		}
	}
	async getTopServers(category) {
		try {
			const topServers = await prisma.servers.findMany({
				where: { category },
				orderBy: { votes: 'desc' },
				take: 3,
			});
			return topServers.length > 0 ? topServers : null;
		} catch (error) {
			console.error('Error fetching top servers for category:', error);
			return null;
		}
	}


	async setServerVotes({ channelID, number }) {
		try {
			const updatedServer = await prisma.servers.update({
				where: { channelID },
				data: { votes: number },
			});
			return updatedServer;
		} catch (error) {
			console.error('Error updating server votes:', error);
			return false;
		}
	}

	async addServerVote({ channelID, number }) {

		try {
			const updatedServer = await prisma.servers.update({
				where: { channelID },
				data: {
					votes: { increment: number },
				},
			});
			return updatedServer;
		} catch (error) {
			console.error('Error adding server vote:', error);
			return false;
		}
	}

	async logAction(action, details) {
		try {
			const logEntry = await prisma.logs.create({
				data: {
					action,
					details,
				},
			});
			return logEntry;
		} catch (error) {
			console.error('Error creating log entry:', error);
			return false;
		}
	}
	async getServerCount() {
		try {
			const count = await prisma.servers.count();
			return count;
		} catch (error) {
			console.error('Error fetching server count:', error);
			return 0;
		}
	}

	async freezeServer(channelID, reason) {
		try {
			const [updatedChannel, logEntry] = await prisma.$transaction([
				prisma.frozenServers.create({
					data: {
						channelID,
						reason,
						frozenAt: new Date(),
					},
				}),
				prisma.logs.create({
					data: {
						action: 'FREEZE_SERVER',
						details: `Server with channelID '${channelID}' was frozen. Reason: ${reason}`,
					},
				}),
			]);
			return updatedChannel;
		} catch (error) {
			console.error('Error freezing server:', error);
			throw new Error('Failed to freeze server in the database.');
		}
	}
	async getFrozenServers() {
		try {
			const servers = await prisma.frozenServers.findMany();
			return servers || [];
		} catch (error) {
			console.error('Error fetching frozen servers:', error);
			return [];
		}
	}

	async setServerVerified(channelID, verified = true) {
		try {
			const [updatedServer, logEntry] = await prisma.$transaction([
				prisma.servers.update({
					where: { channelID },
					data: { verified },
				}),
				prisma.logs.create({
					data: {
						action: verified ? 'VERIFY_SERVER' : 'UNVERIFY_SERVER',
						details: `Server with channelID '${channelID}' was ${verified ? 'verified' : 'unverified'}.`,
					},
				}),
			]);
			return updatedServer;
		} catch (error) {
			console.error('Error updating server verification status:', error);
			return false;
		}
	}

	async toggleServerVerified(channelID) {
		try {
			const server = await prisma.servers.findUnique({
				where: { channelID },
				select: { verified: true },
			});

			if (!server) {
				throw new Error('Server not found');
			}

			const newVerifiedStatus = !server.verified;
			return await this.setServerVerified(channelID, newVerifiedStatus);
		} catch (error) {
			console.error('Error toggling server verification status:', error);
			return false;
		}
	}

	async updateServer(channelID, updateData) {
		try {
			const [updatedServer, logEntry] = await prisma.$transaction([
				prisma.servers.update({
					where: { channelID },
					data: updateData,
				}),
				prisma.logs.create({
					data: {
						action: 'UPDATE_SERVER',
						details: `Server with channelID '${channelID}' was updated.`,
					},
				}),
			]);
			return updatedServer;
		} catch (error) {
			console.error('Error updating server:', error);
			return false;
		}
	}

}

module.exports.Database = Database;
