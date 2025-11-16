const { PrismaClient } = require('@prisma/client');

let prisma = new PrismaClient();
// prisma.$extends({
// 	query: {
// 		feedbacks: {
// 			async create({ args, query, model }) {
// 				const feedback = await query(args);
// 				const feedbackedUserID = result.feedbackedUserID;

// 				const allFeedbacks = await prisma.feedbacks.findMany({
// 					where: { feedbackedUserID },
// 					select: { feedback: true }
// 				});

// 				let positive = 0;
// 				let negative = 0;

// 				for (const f of allFeedbacks) {
// 					const text = f.feedback.toLowerCase();
// 					if (text.includes('good') || text.includes('great') || text.includes('excellent')) positive++;
// 					if (text.includes('bad') || text.includes('scam') || text.includes('poor')) negative++;
// 				}

// 				const total = allFeedbacks.length || 1;
// 				const newScore = Math.min(100, Math.max(0, 50 + ((positive - negative) / total) * 50));

// 				await prisma.users.update({
// 					where: { id: feedbackedUserID },
// 					data: { trustScore: Math.round(newScore) }
// 				});

// 				return result;
// 			}
// 		}
// 	}
// });
module.exports = {
	prisma,
	connectToPrisma: async function () {
		await prisma.$connect();
	}
};
