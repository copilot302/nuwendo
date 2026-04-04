import pool from '../config/database.js';

// Get patient profile by email (public endpoint)
export const getPatientProfile = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Get user with profile
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name,
              pp.phone_number, pp.address, pp.date_of_birth,
              pp.gender, pp.blood_type, pp.allergies, pp.medical_conditions
       FROM users u
       LEFT JOIN patient_profiles pp ON u.id = pp.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      profile: {
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email,
        phone: user.phone_number || '',
        address: user.address || '',
        dateOfBirth: user.date_of_birth || '',
        gender: user.gender || '',
        bloodType: user.blood_type || '',
        allergies: user.allergies || '',
        medicalConditions: user.medical_conditions || ''
      }
    });
  } catch (error) {
    console.error('Get patient profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update patient profile by email (public endpoint)
export const updatePatientProfile = async (req, res) => {
  try {
    const { email } = req.params;
    const { 
      firstName, 
      lastName, 
      phone, 
      address,
      region,
      province, 
      city, 
      barangay, 
      street_address,
      age, 
      height, 
      weight, 
      reasonForConsult, 
      healthGoals 
    } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Get user ID
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    // Update user table (first_name, last_name)
    if (firstName || lastName) {
      await pool.query(
        `UPDATE users 
         SET first_name = COALESCE($1, first_name), 
             last_name = COALESCE($2, last_name),
             updated_at = NOW()
         WHERE id = $3`,
        [firstName, lastName, userId]
      );
    }

    // Check if patient_profile exists
    const profileExists = await pool.query(
      'SELECT id FROM patient_profiles WHERE user_id = $1',
      [userId]
    );

    // Build medical_conditions JSON with extra fields
    const medicalConditionsData = JSON.stringify({
      age: age || '',
      height: height || '',
      weight: weight || '',
      reasonForConsult: reasonForConsult || '',
      healthGoals: healthGoals || []
    });

    if (profileExists.rows.length === 0) {
      // Create new profile - try with region first, fallback without it
      try {
        await pool.query(
          `INSERT INTO patient_profiles (user_id, phone_number, address, region, province, city, barangay, street_address, medical_conditions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [userId, phone || '', address || '', region || '', province || '', city || '', barangay || '', street_address || '', medicalConditionsData]
        );
      } catch (insertErr) {
        if (insertErr.message && insertErr.message.includes('column')) {
          // Older schema detected -- fall back to core profile columns only
          await pool.query(
            `INSERT INTO patient_profiles (user_id, phone_number, address, medical_conditions)
             VALUES ($1, $2, $3, $4)`,
            [userId, phone || '', address || '', medicalConditionsData]
          );
        } else {
          throw insertErr;
        }
      }
    } else {
      // Update existing profile - try with region first, fallback without it
      try {
        await pool.query(
          `UPDATE patient_profiles 
           SET phone_number = COALESCE($1, phone_number),
               address = COALESCE($2, address),
               region = COALESCE($3, region),
               province = COALESCE($4, province),
               city = COALESCE($5, city),
               barangay = COALESCE($6, barangay),
               street_address = COALESCE($7, street_address),
               medical_conditions = COALESCE($8, medical_conditions),
               updated_at = NOW()
           WHERE user_id = $9`,
          [phone, address, region, province, city, barangay, street_address, medicalConditionsData, userId]
        );
      } catch (updateErr) {
        if (updateErr.message && updateErr.message.includes('column')) {
          // Older schema detected -- fall back to core profile columns only
          await pool.query(
            `UPDATE patient_profiles 
             SET phone_number = COALESCE($1, phone_number),
                 address = COALESCE($2, address),
                 medical_conditions = COALESCE($3, medical_conditions),
                 updated_at = NOW()
             WHERE user_id = $4`,
            [phone, address, medicalConditionsData, userId]
          );
        } else {
          throw updateErr;
        }
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update patient profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get full patient profile with extended details by email
export const getFullPatientProfile = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Get user with profile in a schema-safe way.
    // Optional columns may not exist in older local DBs, so read them via to_jsonb(pp)->>key.
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name,
              pp.phone_number,
              pp.address,
              pp.medical_conditions,
              COALESCE(to_jsonb(pp)->>'province', '') as province,
              COALESCE(to_jsonb(pp)->>'city', '') as city,
              COALESCE(to_jsonb(pp)->>'barangay', '') as barangay,
              COALESCE(to_jsonb(pp)->>'street_address', '') as street_address,
              COALESCE(to_jsonb(pp)->>'region', '') as region
       FROM users u
       LEFT JOIN patient_profiles pp ON u.id = pp.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Parse medical_conditions JSON for extended data
    let extendedData = {};
    if (user.medical_conditions) {
      try {
        extendedData = JSON.parse(user.medical_conditions);
      } catch (e) {
        // Not JSON, treat as plain text
        extendedData = { notes: user.medical_conditions };
      }
    }

    res.json({
      success: true,
      profile: {
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email,
        phone: user.phone_number || '',
        address: user.address || '',
        region: user.region || '',
        province: user.province || '',
        city: user.city || '',
        barangay: user.barangay || '',
        street_address: user.street_address || '',
        age: extendedData.age || '',
        height: extendedData.height || '',
        weight: extendedData.weight || '',
        reasonForConsult: extendedData.reasonForConsult || '',
        healthGoals: extendedData.healthGoals || []
      }
    });
  } catch (error) {
    console.error('Get full patient profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};