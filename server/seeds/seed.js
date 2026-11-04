require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Device = require('../models/Device');
const Task = require('../models/Task');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/officetask';

const DEFAULT_DEVICES = [
  {
    deviceId: 'OFFICE-PC-01',
    name: 'Office Laptop 1 (Finance & Ops)',
    deviceKey: process.env.DEVICE_KEY_01 || 'key-office-pc-01',
    status: 'offline'
  },
  {
    deviceId: 'OFFICE-PC-02',
    name: 'Office Laptop 2 (Development)',
    deviceKey: process.env.DEVICE_KEY_02 || 'key-office-pc-02',
    status: 'offline'
  },
  {
    deviceId: 'OFFICE-PC-03',
    name: 'Office Laptop 3 (Customer Support)',
    deviceKey: process.env.DEVICE_KEY_03 || 'key-office-pc-03',
    status: 'offline'
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully.');

    // 1. Seed Admin User
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@officetask.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        name: 'Chief Office Administrator',
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      await admin.save();
      console.log(`[+] Seeded Admin user: ${adminEmail} (password: ${adminPassword})`);
    } else {
      console.log(`[*] Admin user already exists: ${adminEmail}`);
    }

    // 2. Seed 3 Independent Devices
    for (const devData of DEFAULT_DEVICES) {
      let device = await Device.findOne({ deviceId: devData.deviceId });
      if (!device) {
        device = new Device(devData);
        await device.save();
        console.log(`[+] Seeded device: ${devData.deviceId} - ${devData.name}`);
      } else {
        console.log(`[*] Device already exists: ${devData.deviceId}`);
      }
    }

    // 3. Seed Sample Tasks for each device if empty
    const taskCount = await Task.countDocuments();
    if (taskCount === 0) {
      const today = new Date();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const sampleTasks = [
        // OFFICE-PC-01
        {
          deviceId: 'OFFICE-PC-01',
          title: 'Quarterly Vendor Invoices Audit',
          description: 'Reconcile Q1 invoices with bank statements and flag any discrepancies.',
          priority: 'urgent',
          status: 'pending',
          dueDate: today
        },
        {
          deviceId: 'OFFICE-PC-01',
          title: 'Prepare Monthly Payroll Report',
          description: 'Export attendance logs and send draft summary to HR.',
          priority: 'high',
          status: 'pending',
          dueDate: tomorrow
        },
        {
          deviceId: 'OFFICE-PC-01',
          title: 'Update Expense Spreadsheet',
          description: 'File receipts from last week office supply order.',
          priority: 'low',
          status: 'completed',
          completedAt: new Date()
        },

        // OFFICE-PC-02
        {
          deviceId: 'OFFICE-PC-02',
          title: 'Deploy Hotfix to Production API',
          description: 'Merge PR #412 for token expiration issue and verify health checks.',
          priority: 'urgent',
          status: 'pending',
          dueDate: today
        },
        {
          deviceId: 'OFFICE-PC-02',
          title: 'Database Index Optimization',
          description: 'Review slow query logs on MongoDB Atlas and add compound indexes.',
          priority: 'high',
          status: 'pending',
          dueDate: tomorrow
        },
        {
          deviceId: 'OFFICE-PC-02',
          title: 'Weekly Team Code Review',
          description: 'Completed review of desktop widget and electron bridge modules.',
          priority: 'medium',
          status: 'completed',
          completedAt: new Date()
        },

        // OFFICE-PC-03
        {
          deviceId: 'OFFICE-PC-03',
          title: 'Resolve Priority Support Ticket #8841',
          description: 'Customer unable to log into dashboard. Reset credentials and follow up.',
          priority: 'high',
          status: 'pending',
          dueDate: today
        },
        {
          deviceId: 'OFFICE-PC-03',
          title: 'Overdue Client Follow-Up (Acme Corp)',
          description: 'Contact account manager regarding renewal contract sign-off.',
          priority: 'urgent',
          status: 'pending',
          dueDate: yesterday // Overdue example
        },
        {
          deviceId: 'OFFICE-PC-03',
          title: 'Update Knowledgebase FAQ',
          description: 'Add troubleshooting steps for Windows widget screen placement.',
          priority: 'medium',
          status: 'completed',
          completedAt: new Date()
        }
      ];

      await Task.insertMany(sampleTasks);
      console.log(`[+] Seeded ${sampleTasks.length} initial tasks across all 3 laptops.`);
    } else {
      console.log(`[*] Tasks collection already contains ${taskCount} items.`);
    }

    console.log('Database seeding finished.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
