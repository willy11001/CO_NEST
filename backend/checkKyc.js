const { KYC, Agent, User, Role } = require('./models');

async function check() {
  try {
    const kycs = await KYC.findAll({
      include: [{
        model: Agent,
        as: 'agent',
        include: [{
          model: User,
          as: 'user',
          include: [{ model: Role, as: 'role' }]
        }]
      }]
    });
    console.log('Total KYC records found:', kycs.length);
    kycs.forEach((k, index) => {
      console.log(`\n--- KYC Record ${index + 1} ---`);
      console.log('ID:', k.id);
      console.log('AgentID:', k.agentId);
      console.log('CNI Number:', k.idNumber);
      console.log('Status:', k.status);
      console.log('SubmittedAt:', k.submittedAt);
      console.log('Agent Profile Exists:', !!k.agent);
      if (k.agent) {
        console.log('  Agent isVerified:', k.agent.isVerified);
        console.log('  User Name:', k.agent.user?.fullName);
        console.log('  User Role:', k.agent.user?.role?.name);
      }
    });
  } catch (error) {
    console.error('Error finding KYC records:', error);
  }
  process.exit(0);
}

check();
