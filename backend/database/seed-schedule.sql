-- Seed Working Hours for Nuwendo
-- Simplified weekly schedule (single schedule per day)
-- Run this after migrations to populate working hours

-- Clear existing working hours before re-seeding
DELETE FROM working_hours;

-- Clear existing availability windows too (newer table used by the app)
DO $$
BEGIN
    IF to_regclass('public.availability_windows') IS NOT NULL THEN
        DELETE FROM availability_windows;
    END IF;
END $$;

-- Insert Working Hours
-- Format: day_of_week (0=Sunday, 1=Monday, ..., 6=Saturday)
-- Note: working_hours requires appointment_type, so we use a single canonical type: 'on-site'

INSERT INTO working_hours (day_of_week, start_time, end_time, appointment_type, is_active) VALUES
    -- Sunday (7:30 AM - 5:30 PM)
    (0, '07:30:00', '17:30:00', 'on-site', true),

    -- Monday (7:30 AM - 5:30 PM)
    (1, '07:30:00', '17:30:00', 'on-site', true),

    -- Tuesday (7:30 AM - 5:30 PM)
    (2, '07:30:00', '17:30:00', 'on-site', true),

    -- Wednesday (9:00 AM - 5:00 PM)
    (3, '09:00:00', '17:00:00', 'on-site', true),

    -- Thursday (9:00 AM - 5:00 PM)
    (4, '09:00:00', '17:00:00', 'on-site', true),

    -- Friday (9:00 AM - 5:00 PM)
    (5, '09:00:00', '17:00:00', 'on-site', true),

    -- Saturday (7:30 AM - 5:30 PM)
    (6, '07:30:00', '17:30:00', 'on-site', true)

ON CONFLICT (day_of_week, appointment_type) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    is_active = EXCLUDED.is_active;

-- Keep availability_windows in sync if table exists (newer schedule source)
DO $$
BEGIN
    IF to_regclass('public.availability_windows') IS NOT NULL THEN
        INSERT INTO availability_windows (day_of_week, start_time, end_time, appointment_type, is_active) VALUES
            (0, '07:30:00', '17:30:00', 'on-site', true),
            (1, '07:30:00', '17:30:00', 'on-site', true),
            (2, '07:30:00', '17:30:00', 'on-site', true),
            (3, '09:00:00', '17:00:00', 'on-site', true),
            (4, '09:00:00', '17:00:00', 'on-site', true),
            (5, '09:00:00', '17:00:00', 'on-site', true),
            (6, '07:30:00', '17:30:00', 'on-site', true)
        ON CONFLICT (day_of_week, appointment_type) DO UPDATE SET
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            is_active = EXCLUDED.is_active;
    END IF;
END $$;

-- Summary:
-- Sun, Mon, Tue, Sat: 7:30 AM - 5:30 PM (10h)
-- Wed, Thu, Fri: 9:00 AM - 5:00 PM (8h)
