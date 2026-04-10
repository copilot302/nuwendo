import { ArrowRight, Monitor, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const services = [
  {
    number: '01',
    title: 'Nuwendo Starter',
    description: 'An entry-level program designed to kickstart your metabolic health journey with structured support and foundational interventions. Ideal for individuals beginning weight loss or metabolic optimization under guided care.',
    image: '/9.png',
  },
  {
    number: '02',
    title: 'Nutrition Plan',
    description: 'A personalized, evidence-based meal plan tailored to your metabolic profile, preferences, and health goals. Focuses on sustainable eating habits that support weight management and overall wellness.',
    image: '/8.png',
  },
  {
    number: '03',
    title: 'Metabolic Work-up',
    description: 'A comprehensive set of diagnostic tests and assessments to evaluate key metabolic markers such as glucose, insulin, lipids, and hormones. Provides data-driven insights to guide targeted and effective treatment plans.',
    image: '/7.png',
  },
  {
    number: '04',
    title: 'BeFit x Nuwendo',
    description: 'A collaborative program combining fitness training and medical metabolic care to deliver a holistic approach to weight loss and health optimization. Integrates structured exercise with personalized clinical guidance for more effective and sustainable results.',
    image: '/6.png',
  },
]

export function Services() {
  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="container">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-brand font-medium mb-2">ONLINE & CLINIC CONSULTS</p>
          <h2 className="text-3xl md:text-4xl font-bold text-brand-800 mb-4">
            Our Services & Programs
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Looking for trusted medical weight management? Discover our full range of doctor-led in-clinic and online care services.
          </p>

          {/* Appointment Type Badges */}
          <div className="flex justify-center gap-4 mt-6">
            <div className="inline-flex items-center gap-2 bg-brand-100 text-brand px-4 py-2 rounded-full text-sm font-medium">
              <Monitor className="h-4 w-4" />
              Online Consults
            </div>
            <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-4 py-2 rounded-full text-sm font-medium">
              <Building2 className="h-4 w-4" />
              Clinic Visits
            </div>
          </div>
        </motion.div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 h-full flex flex-col"
            >
              {/* Image */}
              <div className="relative h-48 bg-gradient-to-br from-brand-700 to-brand-800 overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.title}
                  className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-brand text-white text-lg font-bold px-3 py-1 rounded-lg">
                  {service.number}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-3xl font-extrabold text-brand-800 leading-tight min-h-[6.5rem] group-hover:text-brand transition-colors">
                  {service.title}
                </h3>
                <p className="text-gray-600 text-base leading-relaxed flex-1">
                  {service.description}
                </p>
                <Link to="/signup" className="inline-flex items-center gap-2 text-brand text-lg font-medium mt-6 hover:gap-3 transition-all">
                  Book Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
