// Philippine Address Data - NCR (Metro Manila) for now
// Can be expanded to include more provinces

export const philippineAddresses = {
  provinces: [
    { code: 'NCR', name: 'National Capital Region (Metro Manila)' },
    // Add more provinces as needed
  ],
  
  cities: {
    NCR: [
      { code: 'MANILA', name: 'Manila' },
      { code: 'QUEZON', name: 'Quezon City' },
      { code: 'MAKATI', name: 'Makati' },
      { code: 'TAGUIG', name: 'Taguig' },
      { code: 'PASIG', name: 'Pasig' },
      { code: 'MANDALUYONG', name: 'Mandaluyong' },
      { code: 'SAN_JUAN', name: 'San Juan' },
      { code: 'MARIKINA', name: 'Marikina' },
      { code: 'CALOOCAN', name: 'Caloocan' },
      { code: 'MALABON', name: 'Malabon' },
      { code: 'NAVOTAS', name: 'Navotas' },
      { code: 'VALENZUELA', name: 'Valenzuela' },
      { code: 'LAS_PINAS', name: 'Las Piñas' },
      { code: 'MUNTINLUPA', name: 'Muntinlupa' },
      { code: 'PARANAQUE', name: 'Parañaque' },
      { code: 'PASAY', name: 'Pasay' },
      { code: 'PATEROS', name: 'Pateros' },
    ]
  },
  
  barangays: {
    MANILA: ['Ermita', 'Intramuros', 'Malate', 'Paco', 'Pandacan', 'Port Area', 'Sampaloc', 'San Miguel', 'San Nicolas', 'Santa Ana', 'Santa Cruz', 'Tondo'],
    QUEZON: ['Bagbag', 'Batasan Hills', 'Central', 'Commonwealth', 'Diliman', 'Fairview', 'Kamuning', 'Loyola Heights', 'Project 4', 'Project 6', 'Project 8', 'Tandang Sora', 'Teachers Village', 'Timog', 'UP Campus'],
    MAKATI: ['Bel-Air', 'Dasmarinas', 'Forbes Park', 'Guadalupe Nuevo', 'Guadalupe Viejo', 'Magallanes', 'Olympia', 'Palanan', 'Poblacion', 'Rockwell', 'Salcedo', 'San Antonio', 'San Lorenzo', 'Urdaneta', 'Valenzuela'],
    TAGUIG: ['Bagumbayan', 'Bambang', 'Calzada', 'Central Bicutan', 'Central Signal Village', 'Fort Bonifacio', 'Hagonoy', 'Ibayo-Tipas', 'Katuparan', 'Ligid-Tipas', 'Lower Bicutan', 'Maharlika Village', 'Napindan', 'New Lower Bicutan', 'North Signal Village', 'Pinagsama', 'San Miguel', 'Santa Ana', 'Signal Village', 'South Signal Village', 'Tanyag', 'Tuktukan', 'Upper Bicutan', 'Ususan', 'Wawa', 'Western Bicutan'],
    PASIG: ['Bagong Ilog', 'Bagong Katipunan', 'Bambang', 'Buting', 'Caniogan', 'Dela Paz', 'Kalawaan', 'Kapasigan', 'Kapitolyo', 'Malinao', 'Manggahan', 'Maybunga', 'Oranbo', 'Palatiw', 'Pinagbuhatan', 'Pineda', 'Rosario', 'Sagad', 'San Antonio', 'San Joaquin', 'San Jose', 'San Miguel', 'San Nicolas', 'Santa Cruz', 'Santa Lucia', 'Santa Rosa', 'Santo Tomas', 'Santolan', 'Sumilang', 'Ugong'],
    MANDALUYONG: ['Addition Hills', 'Bagong Silang', 'Barangka Drive', 'Barangka Ibaba', 'Barangka Ilaya', 'Barangka Itaas', 'Buayang Bato', 'Burol', 'Daang Bakal', 'Hagdang Bato Itaas', 'Hagdang Bato Libis', 'Harapin ang Bukas', 'Highway Hills', 'Hulo', 'Mabini-J. Rizal', 'Malamig', 'Mauway', 'Namayan', 'New Zañiga', 'Old Zañiga', 'Pag-asa', 'Plainview', 'Pleasant Hills', 'Poblacion', 'San Jose', 'Vergara', 'Wack-Wack Greenhills'],
    SAN_JUAN: ['Addition Hills', 'Balong-Bato', 'Batis', 'Corazon de Jesus', 'Ermitaño', 'Greenhills', 'Isabelita', 'Kabayanan', 'Little Baguio', 'Maytunas', 'Onse', 'Pasadeña', 'Pedro Cruz', 'Progreso', 'Rivera', 'Salapan', 'San Perfecto', 'Santa Lucia', 'Tibagan', 'West Crame'],
    MARIKINA: ['Barangka', 'Calumpang', 'Concepcion Uno', 'Concepcion Dos', 'Fortune', 'Industrial Valley', 'Jesus dela Peña', 'Malanday', 'Marikina Heights', 'Nangka', 'Parang', 'San Roque', 'Santa Elena', 'Santo Niño', 'Tañong', 'Tumana'],
    // Add more barangays for other cities as needed
    CALOOCAN: ['Bagong Silang', 'Bagumbong', 'Camarin', 'Kaybiga', 'Tala', 'Grace Park', 'San Jose'],
    MALABON: ['Acacia', 'Baritel', 'Bayan-bayanan', 'Catmon', 'Concepcion', 'Dampalit', 'Flores', 'Hulong Duhat', 'Ibaba', 'Longos', 'Maysilo', 'Muzon', 'Niugan', 'Panghulo', 'Potrero', 'San Agustin', 'Santolan', 'Tañong', 'Tinajeros', 'Tonsuya', 'Tugatog'],
    NAVOTAS: ['Bagumbayan North', 'Bagumbayan South', 'Bangculasi', 'Daanghari', 'Navotas East', 'Navotas West', 'North Bay Blvd North', 'North Bay Blvd South', 'San Jose', 'San Rafael Village', 'San Roque', 'Sipac-Almacen', 'Tangos', 'Tanza'],
    VALENZUELA: ['Arkong Bato', 'Bagbaguin', 'Balangkas', 'Bignay', 'Bisig', 'Canumay East', 'Canumay West', 'Coloong', 'Dalandanan', 'Isla', 'Karuhatan', 'Lawang Bato', 'Lingunan', 'Mabolo', 'Malanday', 'Malinta', 'Mapulang Lupa', 'Marulas', 'Maysan', 'Palasan', 'Parada', 'Pariancillo Villa', 'Paso de Blas', 'Pasolo', 'Poblacion', 'Polo', 'Punturin', 'Rincon', 'Tagalag', 'Ugong', 'Viente Reales', 'Wawang Pulo'],
    LAS_PINAS: ['Almanza Uno', 'Almanza Dos', 'BF International', 'Daniel Fajardo', 'Elias Aldana', 'Ilaya', 'Manuyo Uno', 'Manuyo Dos', 'Pamplona Uno', 'Pamplona Dos', 'Pamplona Tres', 'Pilar', 'Pulang Lupa Uno', 'Pulang Lupa Dos', 'Talon Uno', 'Talon Dos', 'Talon Tres', 'Talon Cuatro', 'Talon Singko', 'Zapote'],
    MUNTINLUPA: ['Alabang', 'Ayala Alabang', 'Buli', 'Cupang', 'Poblacion', 'Putatan', 'Sucat', 'Tunasan', 'Bayanan'],
    PARANAQUE: ['Baclaran', 'BF Homes', 'Don Bosco', 'Don Galo', 'La Huerta', 'Marcelo Green', 'Merville', 'Moonwalk', 'San Antonio', 'San Dionisio', 'San Isidro', 'San Martin de Porres', 'Santo Niño', 'Sun Valley', 'Tambo', 'Vitalez'],
    PASAY: ['Baclaran', 'Domestic Airport', 'EDSA', 'F.B. Harrison', 'Libertad', 'Malibay', 'Maricaban', 'Pasay Rotonda', 'San Isidro', 'San Jose', 'San Rafael', 'San Roque', 'Santa Clara', 'Santo Niño', 'Tramo', 'Villamor'],
    PATEROS: ['Aguho', 'Magtanggol', 'Martires del 96', 'Poblacion', 'San Pedro', 'San Roque', 'Santa Ana', 'Santo Rosario-Kanluran', 'Santo Rosario-Silangan', 'Tabacalera'],
  }
};
