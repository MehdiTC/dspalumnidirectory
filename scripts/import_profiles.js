require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const csvPath = path.join(__dirname, '../data/dsp_profiles.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Map industry to allowed spheres
function mapIndustry(industry) {
  if (!industry) return 'Other';
  const val = industry.toLowerCase();
  if (val.includes('finance') || val.includes('bank')) return 'Finance';
  if (val.includes('consult')) return 'Consulting';
  if (val.includes('tech') || val.includes('software') || val.includes('engineer') || val.includes('product')) return 'Tech';
  return 'Other';
}

// Format pledge class
function formatPledgeClass(raw) {
  if (!raw || raw.length < 2) return '';
  const sem = raw[0] === 'F' ? 'Fall' : raw[0] === 'S' ? 'Spring' : '';
  const year = raw.slice(1);
  if (!sem || !year) return '';
  return `${sem} '${year}`;
}

(async () => {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: '\t',
    trim: true,
  });

  let inserted = 0, skipped = 0;
  for (const row of records) {
    const graduationYear = parseInt(row['Year'], 10);
    const email = row['Email Address']?.trim();
    if (!email || !graduationYear || graduationYear > 2024) {
      skipped++;
      continue;
    }
    // Check for existing profile
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (fetchError) {
      console.error(`Error checking existing for ${email}:`, fetchError.message);
      skipped++;
      continue;
    }
    if (existing) {
      console.log(`Skipping existing profile: ${email}`);
      skipped++;
      continue;
    }
    // Prepare profile data
    const profile = {
      name: row['Member Name'] || '',
      email,
      pledgeClass: formatPledgeClass(row['Pledge Class']),
      graduationYear: row['Year'] || '',
      major: row['Field of Study'] || '',
      location: '',
      sphere: [mapIndustry(row['Industry'])],
      role: row['Current Role'] || '',
      company: row['Current Employer'] || '',
      isStudent: graduationYear >= new Date().getFullYear(),
      linkedinUrl: '',
      bio: '',
      profile_picture_url: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error: insertError } = await supabase.from('profiles').insert(profile);
    if (insertError) {
      console.error(`Error inserting ${email}:`, insertError.message);
      skipped++;
    } else {
      console.log(`Inserted: ${email}`);
      inserted++;
    }
  }
  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}`);
})(); 