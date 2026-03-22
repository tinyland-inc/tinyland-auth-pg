/**
 * Seed script for MassageIthaca content tables.
 *
 * Populates business_profile, services, business_hours, reviews,
 * and practitioners from hardcoded data extracted from the codebase.
 *
 * Idempotent: uses INSERT ... ON CONFLICT DO UPDATE.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/seed-content.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as content from '../src/content-schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = neon(DATABASE_URL);
const db = drizzle(client);

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const BUSINESS_PROFILE = {
  name: 'Massage Ithaca',
  phone: '+16072014926',
  email: 'contact@massageithaca.com',
  streetAddress: '950 Danby Rd',
  suiteUnit: '96B',
  city: 'Ithaca',
  state: 'NY',
  postalCode: '14850',
  country: 'US',
  latitude: '42.42357956',
  longitude: '-76.50116718',
  licenseNumber: '026298',
  description:
    'TMD Massage Specialist in Ithaca, NY specializing in pain relief, trigger point therapy, and myofascial release. Jennifer Whitaker, LMT, BA (psychology) helps clients manage chronic pain, TMJ disorders, fibromyalgia, and stress.',
  slogan: 'Pain Relief Through Holistic Healing',
  websiteUrl: 'https://massageithaca.com',
  googleMapsUrl:
    'https://www.google.com/maps/place/Massage+Ithaca/@42.42357955820303,-76.50116717728487',
};

const SERVICES = [
  {
    acuityId: 'urgent-pain-relief',
    name: 'URGENT care Pain Relief Massage: Break the pain cycle, and heal injuries.',
    description: 'Urgent care pain relief massage (45 minutes)',
    category: 'Urgent Care Pain Relief Massage',
    durationMinutes: 45,
    priceCents: 15000,
    currency: 'USD',
    active: true,
    displayOrder: 1,
  },
  {
    acuityId: 'therapeutic-45',
    name: '45 minute therapeutic massage',
    description: '45 minute therapeutic massage session',
    category: 'Urgent Care Pain Relief Massage',
    durationMinutes: 45,
    priceCents: 10000,
    currency: 'USD',
    active: true,
    displayOrder: 2,
  },
  {
    acuityId: 'tmd-1st-consultation',
    name: 'TMD 1st Consultation & Session',
    description: 'Initial TMD consultation and treatment (30 minutes)',
    category: 'TMD',
    durationMinutes: 30,
    priceCents: 15000,
    currency: 'USD',
    active: true,
    displayOrder: 3,
  },
  {
    acuityId: 'tmd-single-30',
    name: 'TMD: single session (30 min)',
    description: 'TMD follow-up single session including intraoral work',
    category: 'TMD',
    durationMinutes: 30,
    priceCents: 10000,
    currency: 'USD',
    active: true,
    displayOrder: 4,
  },
  {
    acuityId: 'tmd-double-60',
    name: 'TMD: double session (60 minutes)',
    description: 'TMD double session including intraoral work',
    category: 'TMD',
    durationMinutes: 60,
    priceCents: 20000,
    currency: 'USD',
    active: true,
    displayOrder: 5,
  },
  {
    acuityId: 'cervical-30',
    name: 'Cervical Medical Massage 30',
    description: 'Targeted neck and cervical area medical massage (30 min)',
    category: 'Cervical',
    durationMinutes: 30,
    priceCents: 7500,
    currency: 'USD',
    active: true,
    displayOrder: 6,
  },
  {
    acuityId: 'cervical-60',
    name: 'Cervical Medical Massage 60',
    description: 'Extended neck and cervical area medical massage (60 min)',
    category: 'Cervical',
    durationMinutes: 60,
    priceCents: 15000,
    currency: 'USD',
    active: true,
    displayOrder: 7,
  },
  {
    acuityId: 'gift-certificate',
    name: 'Gift Certificate',
    description: 'Gift certificate ($100 value)',
    category: 'Gift Certificates',
    durationMinutes: 0,
    priceCents: 10000,
    currency: 'USD',
    active: true,
    displayOrder: 8,
  },
  {
    acuityId: 'pack-5-sessions',
    name: '5 pack 45min Therapeutic or 30 min TMD)',
    description: '5-session package (45 min therapeutic or 30 min TMD)',
    category: 'Packages',
    durationMinutes: 0,
    priceCents: 49000,
    currency: 'USD',
    active: true,
    displayOrder: 9,
  },
];

// CLAUDE.md canonical hours (Starting Sept 1): Sat 11-4, Mon 11-4, Fri 1-6
const BUSINESS_HOURS = [
  { dayOfWeek: 1, opens: '11:00', closes: '16:00', label: 'Monday' },
  { dayOfWeek: 5, opens: '13:00', closes: '18:00', label: 'Friday' },
  { dayOfWeek: 6, opens: '11:00', closes: '16:00', label: 'Saturday' },
];

const REVIEWS = [
  {
    reviewerName: 'Theresa',
    rating: 5,
    text: 'Almost a year ago, I was experiencing more muscle pain than usual and found Massage Ithaca online. Because managing my muscle pain is important to me, I consistently schedule twice a month with Jennifer and really appreciate her custom massages. Each time I come in, she asks me how my body feels and if there\'s a specific area that I\'d like her to work on. Jennifer has a calming presence and is confident in her skill and knowledge. Her space on Danby Road is peaceful and relaxing. Highly recommend!',
    source: 'google',
    tags: ['muscle pain', 'custom massage', 'regular client'],
    featured: true,
  },
  {
    reviewerName: 'Carrie G.',
    rating: 5,
    text: "I've had 27 years of massages all over the world and Jennifer's massages are highly skilled have brought me great relief of pain and tension. Her massages are as advertised, and you can tell she's had a decade of experience under her belt. She is very kind and I have no trouble asking for more or less pressure, although I can't recall ever having to tell her because she's very intuitive. She's worked a lot on my neck and TMJ, although I do not live close enough to see her regularly I appreciate when she gives me feedback and recommendations for more work. I absolutely love the ground level space she has in her home, it is well decorated and exceptionally inviting and peaceful, and the parking is great right near the door.",
    source: 'google',
    tags: ['TMJ', 'neck', 'experienced', 'intuitive'],
    featured: true,
  },
  {
    reviewerName: 'Jehan Roberson',
    rating: 5,
    text: "I had a great experience with Jennifer! She quickly found trigger points for my chronic neck and shoulder pain and, in twenty minutes, released some serious tightness that many other massage therapists haven't been able to help with. Looking forward to continuing to work together!",
    source: 'google',
    tags: ['neck', 'shoulder pain', 'trigger points'],
    featured: false,
  },
  {
    reviewerName: 'Alyssa Welty',
    rating: 5,
    text: 'I came to see Jennifer because I was experiencing pretty severe pain in my jaw while chewing. After one session with her, the tension was dissipated and the pain has been gone ever since (about 2 months ago). I had 5 sessions with her and the relief has been lasting.',
    source: 'google',
    tags: ['TMD', 'jaw pain', 'lasting relief'],
    featured: true,
  },
  {
    reviewerName: 'Zachary Batterman',
    rating: 5,
    text: 'I have been seeing Jennifer for about 7 months for TMD massages and it has done so much to relieve my neck/jaw pain and headaches. Although the process of a TMD massage can be intense, Jennifer always checks in throughout the massage to ensure I am comfortable, and each time I leave her space I feel relaxed and revived. 10/10 would recommend to anyone experiencing TMD problems!',
    source: 'google',
    tags: ['TMD', 'neck', 'jaw pain', 'headaches'],
    featured: true,
  },
  {
    reviewerName: 'Laura Enama',
    rating: 5,
    text: 'Jennifer was an incredible support through my pregnancy journey and well into postpartum recovery. She always made me feel comfortable and well-cared for.',
    source: 'google',
    tags: ['pregnancy', 'postpartum'],
    featured: false,
  },
  {
    reviewerName: 'Deb Scott',
    rating: 5,
    text: "To find someone who may be able to help relieve me of the chronic pain, discomfort and fatigue TMD has caused - I only wish I had made the phone call months earlier. Jen is not only professional, she is kind, compassionate, considerate, respectful, understanding, and truly empathetic to what has been happening to my jaw. Her place of business is quiet and clean; the music beautifully picked, volume set to the correct level. She is quiet and concentrated, when focused and necessary. My only negative is I wish I had started therapy sooner.",
    source: 'google',
    tags: ['TMD', 'chronic pain', 'professional'],
    featured: true,
  },
  {
    reviewerName: 'Tony Henderson',
    rating: 5,
    text: "Jennifer is very friendly and professional and I felt totally at ease throughout the session. She's clearly passionate about her work and takes great care to address any problem areas. Jennifer listened and covered each and every area on my back that I wanted focus on. It was amazing. After my first session, it felt like a weight had been lifted and I went away feeling very relaxed.",
    source: 'google',
    tags: ['back pain', 'relaxing', 'professional'],
    featured: false,
  },
  {
    reviewerName: 'Michelle Kober',
    rating: 5,
    text: "Pregnancy massage with Jen was such a wonderful experience. It was so relaxing and comfortable, and she really paid attention to all of my needs. I always left the appointment feeling refreshed, and she would tell me what points of tension she noticed, and what I could try at home to help relieve any discomfort in between appointments. 10/10 recommend.",
    source: 'google',
    tags: ['pregnancy', 'relaxing', 'home care advice'],
    featured: false,
  },
  {
    reviewerName: 'Julia Baldassarra',
    rating: 5,
    text: 'I had a TMD massage with Jennifer and she is incredibly knowledgeable and talented. The massage was wonderful and she provided many insights about what could be causing the TMD pain. She provided an aftercare guide which has been extremely helpful in the days following my massage.',
    source: 'google',
    tags: ['TMD', 'knowledgeable', 'aftercare'],
    featured: false,
  },
  {
    reviewerName: 'Hannah Cannon',
    rating: 5,
    text: "Jennifer is so wonderful! A perfect balance between personable and professional. She will do everything she can to make you feel comfortable and relaxed, and she thinks of every detail. From the heated massage table and warm rice bag, to her choice of music and gentle explanation of how she will care for you, I eagerly wait my appointments with her, and I always leave feeling pain free and relaxed. Highly recommend her TMJ/TMD program.",
    source: 'google',
    tags: ['TMJ', 'TMD', 'heated table', 'attention to detail'],
    featured: false,
  },
  {
    reviewerName: 'Jason Peckham',
    rating: 5,
    text: "A massage with Jen is so healing. You can tell she has a very high level of training and experience. She gave me SO much relief and healed a chronic pain I was having in my neck and shoulder. She's also so nice to be around, with a very calming energy.",
    source: 'google',
    tags: ['neck', 'shoulder', 'chronic pain', 'healing'],
    featured: false,
  },
  {
    reviewerName: 'Liz Hartman',
    rating: 5,
    text: "Highly recommended! Jennifer is incredible with pain relief, sports massage, prenatal massage and more. I should know since I've seen her for all three! It wasn't until I found Jennifer years ago that I learned that massage can provide *lasting* relief from pain (back pain during pregnancy in my case). She has such a special gift for sensing what people need and making you feel comfortable. I'm also an athlete and rely on Jennifer as a key part of my recovery from hard workouts. She is a wonderful human on top of all of that.",
    source: 'google',
    tags: ['prenatal', 'sports massage', 'pain relief', 'athlete recovery'],
    featured: true,
  },
  {
    reviewerName: 'Brooke Phayre',
    rating: 5,
    text: "Jennifer is great and truly cares for helping any needs you may have. I've been seeing her biweekly for the end of my pregnancy and wish I started sooner! She makes the whole experience comfortable and relaxing.",
    source: 'google',
    tags: ['pregnancy', 'biweekly', 'comfortable'],
    featured: false,
  },
  {
    reviewerName: 'Courtney Lewis',
    rating: 5,
    text: "Massage Ithaca was referred to me through my midwife during my first pregnancy. I initially just wanted to experience some relaxation and to lay on my belly again (god bless that pregnancy pillow), which I did! However, at the beginning of my third trimester I started to experience some sciatic nerve pain in my lower back. It was impacting my mobility and I feared that the last three months of my pregnancy would be limited and uncomfortable. Thankfully, Jennifer used her skills and wowed me with just one session. I am so grateful that she was able to assist me with this experience.",
    source: 'google',
    tags: ['pregnancy', 'sciatic pain', 'mobility'],
    featured: false,
  },
  {
    reviewerName: 'Kelly Houk',
    rating: 5,
    text: "I have adhesive capsulitis, and Jennifer's expert work is remarkable. She treats my whole body while focusing on my frozen shoulder. I am healing much faster because of her. I recommend Massage Ithaca without reservation.",
    source: 'google',
    tags: ['frozen shoulder', 'adhesive capsulitis', 'whole body'],
    featured: false,
  },
  {
    reviewerName: 'Elena Maria Echeverria Mora',
    rating: 5,
    text: 'Jennifer was awesome! She was always willing to hear me and work with me on the zones where I needed more help. Her massages are really good!',
    source: 'google',
    tags: ['attentive', 'targeted treatment'],
    featured: false,
  },
  {
    reviewerName: 'Deanna Jacobs',
    rating: 5,
    text: 'Jennifer is amazing.. She listens and takes an extremely thoughtful approach to what you need. She is a true caregiver in every way.',
    source: 'google',
    tags: ['thoughtful', 'caregiver', 'listens'],
    featured: false,
  },
  {
    reviewerName: 'Jamie Love',
    rating: 5,
    text: 'Jennifer is excellent at what she does and provided me with very skillful relaxation. I highly recommend her services',
    source: 'google',
    tags: ['skillful', 'relaxation'],
    featured: false,
  },
  {
    reviewerName: 'Marilee Murphy',
    rating: 5,
    text: 'Jennifer has great hands and knowledge!!',
    source: 'google',
    tags: ['knowledgeable', 'skilled'],
    featured: false,
  },
];

const PRACTITIONER = {
  handle: 'jen',
  name: 'Jennifer Whitaker',
  title: 'Licensed Massage Therapist and TMD Specialist',
  bio: 'Jennifer Whitaker, LMT, BA (psychology) specializes in TMD/TMJ disorders, chronic pain relief, and therapeutic bodywork. With over a decade of experience, she uses trigger point therapy and myofascial release to help clients manage pain, reduce stress, and heal injuries.',
  credentials: ['LMT', 'BA (Psychology)'],
  specializations: [
    'TMD/TMJ Massage',
    'Myofascial Release',
    'Trigger Point Therapy',
    'Prenatal Massage',
    'Chronic Pain Management',
    'Cervical/Neck Medical Massage',
    'Sports Massage',
  ],
  licenseNumber: '026298',
  photoUrl: 'https://massageithaca.com/jen1.webp',
};

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

const seedBusinessProfile = async () => {
  // Use raw SQL for upsert since drizzle's onConflictDoUpdate needs a target
  // and we want to ensure single-row semantics.
  const existing = await db.select().from(content.businessProfile).limit(1);

  if (existing.length === 0) {
    await db.insert(content.businessProfile).values(BUSINESS_PROFILE);
    console.log('  inserted business_profile');
  } else {
    await db
      .update(content.businessProfile)
      .set({ ...BUSINESS_PROFILE, updatedAt: sql`now()` });
    console.log('  updated business_profile');
  }
};

const seedServices = async () => {
  for (const svc of SERVICES) {
    await db
      .insert(content.services)
      .values(svc)
      .onConflictDoUpdate({
        target: content.services.acuityId,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          category: sql`excluded.category`,
          durationMinutes: sql`excluded.duration_minutes`,
          priceCents: sql`excluded.price_cents`,
          currency: sql`excluded.currency`,
          active: sql`excluded.active`,
          displayOrder: sql`excluded.display_order`,
          updatedAt: sql`now()`,
        },
      });
  }
  console.log(`  upserted ${SERVICES.length} services`);
};

const seedBusinessHours = async () => {
  // Delete existing and re-insert (small table, simpler than per-row upsert)
  await db.delete(content.businessHours);
  await db.insert(content.businessHours).values(BUSINESS_HOURS);
  console.log(`  inserted ${BUSINESS_HOURS.length} business_hours`);
};

const seedReviews = async () => {
  for (const review of REVIEWS) {
    // Use reviewer_name + text hash as conflict detection (no natural key)
    const existing = await db
      .select({ id: content.reviews.id })
      .from(content.reviews)
      .where(sql`reviewer_name = ${review.reviewerName} AND text = ${review.text}`)
      .limit(1);

    if (existing.length === 0) {
      await db.insert(content.reviews).values(review);
    } else {
      await db
        .update(content.reviews)
        .set({
          rating: review.rating,
          source: review.source,
          tags: review.tags,
          featured: review.featured,
          updatedAt: sql`now()`,
        })
        .where(sql`id = ${existing[0].id}`);
    }
  }
  console.log(`  upserted ${REVIEWS.length} reviews`);
};

const seedPractitioners = async () => {
  await db
    .insert(content.practitioners)
    .values(PRACTITIONER)
    .onConflictDoUpdate({
      target: content.practitioners.handle,
      set: {
        name: sql`excluded.name`,
        title: sql`excluded.title`,
        bio: sql`excluded.bio`,
        credentials: sql`excluded.credentials`,
        specializations: sql`excluded.specializations`,
        licenseNumber: sql`excluded.license_number`,
        photoUrl: sql`excluded.photo_url`,
        updatedAt: sql`now()`,
      },
    });
  console.log('  upserted practitioner: jen');
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  console.log('Seeding content tables...');

  // Create tables if they do not exist (DDL)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS business_profile (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      email VARCHAR(255),
      street_address VARCHAR(255) NOT NULL,
      suite_unit VARCHAR(64),
      city VARCHAR(128) NOT NULL,
      state VARCHAR(2) NOT NULL,
      postal_code VARCHAR(10) NOT NULL,
      country VARCHAR(2) NOT NULL DEFAULT 'US',
      latitude NUMERIC(12,8),
      longitude NUMERIC(12,8),
      license_number VARCHAR(32),
      description TEXT,
      slogan VARCHAR(255),
      website_url VARCHAR(512),
      google_maps_url TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      acuity_id VARCHAR(64) UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(128),
      duration_minutes INTEGER NOT NULL,
      price_cents INTEGER NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      active BOOLEAN NOT NULL DEFAULT true,
      display_order INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS business_hours (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      day_of_week SMALLINT NOT NULL,
      opens TIME NOT NULL,
      closes TIME NOT NULL,
      label VARCHAR(64),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reviewer_name VARCHAR(255) NOT NULL,
      rating SMALLINT NOT NULL,
      text TEXT NOT NULL,
      source VARCHAR(64) NOT NULL DEFAULT 'google',
      tags TEXT[],
      featured BOOLEAN NOT NULL DEFAULT false,
      published_at TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS practitioners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      handle VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      title VARCHAR(128),
      bio TEXT,
      credentials TEXT[],
      specializations TEXT[],
      license_number VARCHAR(32),
      photo_url VARCHAR(512),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  console.log('Tables created/verified.');

  await seedBusinessProfile();
  await seedServices();
  await seedBusinessHours();
  await seedReviews();
  await seedPractitioners();

  console.log('Content seed complete.');
};

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
