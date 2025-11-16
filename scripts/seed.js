require('dotenv').config();
const mongoose = require('mongoose');
const Booth = require('../models/Booth');
const Rider = require('../models/Rider');
const AdminUser = require('../models/AdminUser');

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Booth.deleteMany({}),
      Rider.deleteMany({}),
      AdminUser.deleteMany({})
    ]);

    console.log('🗑️  Cleared existing data');

    // Create SOURCE booths (3 booths at same location - CUET campus)
    const sourceBooths = [
      {
        boothId: 'SOURCE-BOOTH-01',
        name: 'Source Booth 01',
        location: {
          type: 'Point',
          coordinates: [91.9692, 22.4625] // CUET coordinates
        },
        address: 'CUET Main Gate, Chittagong'
      },
      {
        boothId: 'SOURCE-BOOTH-02',
        name: 'Source Booth 02',
        location: {
          type: 'Point',
          coordinates: [91.9692, 22.4625] // Same location as Booth 01
        },
        address: 'CUET Main Gate, Chittagong'
      },
      {
        boothId: 'SOURCE-BOOTH-03',
        name: 'Source Booth 03',
        location: {
          type: 'Point',
          coordinates: [91.9692, 22.4625] // Same location as Booth 01
        },
        address: 'CUET Main Gate, Chittagong'
      }
    ];

    // Create DESTINATION booths (3 different locations)
    const destinationBooths = [
      {
        boothId: 'DEST-01',
        name: 'Destination 01',
        location: {
          type: 'Point',
          coordinates: [91.9750, 22.4680] // ~600m away
        },
        address: 'Destination 01, Chittagong'
      },
      {
        boothId: 'DEST-02',
        name: 'Destination 02',
        location: {
          type: 'Point',
          coordinates: [91.9800, 22.4700] // ~1km away
        },
        address: 'Destination 02, Chittagong'
      },
      {
        boothId: 'DEST-03',
        name: 'Destination 03',
        location: {
          type: 'Point',
          coordinates: [91.9850, 22.4650] // ~1.5km away
        },
        address: 'Destination 03, Chittagong'
      }
    ];

    // Insert source booths
    await Booth.insertMany(sourceBooths);
    console.log(`✅ Created ${sourceBooths.length} source booths`);

    // Insert destination booths
    await Booth.insertMany(destinationBooths);
    console.log(`✅ Created ${destinationBooths.length} destination booths`);

    // Create sample riders (near CUET area)
    const riders = [
      {
        riderId: 'RIDER-001',
        name: 'Saeed Ahmed',
        phone: '+880-1765432101',
        location: {
          type: 'Point',
          coordinates: [91.9692, 22.4625] // CUET area
        },
        status: 'online', // Online for demo
        pointsBalance: 150
      },
      {
        riderId: 'RIDER-002',
        name: 'Avro Biswas',
        phone: '+880-1765432102',
        location: {
          type: 'Point',
          coordinates: [91.9700, 22.4630] // Near CUET
        },
        status: 'offline',
        pointsBalance: 200
      },
      {
        riderId: 'RIDER-003',
        name: 'Tarek Ahmed',
        phone: '+880-1765432103',
        location: {
          type: 'Point',
          coordinates: [91.9685, 22.4620] // Near CUET
        },
        status: 'offline',
        pointsBalance: 100
      }
    ];

    await Rider.insertMany(riders);
    console.log(`✅ Created ${riders.length} riders`);

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@erickshaw.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const admin = await AdminUser.create({
      email: adminEmail,
      password: adminPassword,
      name: 'System Administrator',
      role: 'superadmin'
    });

    console.log(`✅ Created admin user: ${admin.email}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Summary:');
    console.log(`   Source Booths: ${sourceBooths.length}`);
    console.log(`   Destination Booths: ${destinationBooths.length}`);
    console.log(`   Total Booths: ${sourceBooths.length + destinationBooths.length}`);
    console.log(`   Riders: ${riders.length}`);
    console.log(`   Admin: ${admin.email}`);
    console.log('\n🔐 Admin Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();
