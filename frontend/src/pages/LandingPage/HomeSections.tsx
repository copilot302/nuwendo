import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, Building2, HeartPulse, MessagesSquare, Monitor, Percent, Quote, UsersRound } from 'lucide-react'

const serviceCards = [
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

const rotatingLines = [
  'Welcome to Nuwendo',
  'Doctor-Led Weight Loss & Metabolic Health',
  'Makati Clinic & Online Consults',
  'More Than Weight Loss',
]

export function HomeSections() {
  return (
    <>
  <section className="bg-white py-14 md:py-20">
        <div className="container">
          <div className="max-w-6xl mx-auto space-y-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              className="grid lg:grid-cols-2 gap-8 items-end"
            >
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-brand font-semibold">Who We Are</p>
                <h2 className="mt-3 text-2xl md:text-4xl font-black text-brand-800">Discover why you should choose Nuwendo</h2>
              </div>
              <p className="text-slate-600 leading-relaxed text-base md:text-lg">
                We combine medical expertise, metabolic science, and compassionate coaching so every plan feels practical,
                personalized, and sustainable for real life.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand px-6 py-10 md:px-10"
            >
              <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <p className="text-sm uppercase tracking-[0.2em] text-brand-100 font-semibold relative z-10">What We Do</p>
              <h3 className="text-2xl md:text-5xl font-black text-white mt-3 max-w-3xl relative z-10">
                Explore our doctor-led care programs
              </h3>
              <p className="text-brand-100 mt-4 text-base md:text-lg max-w-3xl relative z-10">
                Online & clinic consults: Looking for trusted medical weight management? Discover our full range of
                doctor-led in-clinic and online care services.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <div className="text-center mb-12">
                <p className="text-brand font-medium mb-2 uppercase tracking-[0.16em]">ONLINE & CLINIC CONSULTS</p>
                <h3 className="text-2xl md:text-5xl font-black text-brand-800">Our Services &amp; Programs</h3>
                <p className="text-slate-600 max-w-3xl mx-auto mt-4 text-base md:text-lg">
                  Looking for trusted medical weight management? Discover our full range of doctor-led in-clinic and online care services.
                </p>

                <div className="flex justify-center gap-4 mt-7 flex-wrap">
                  <div className="inline-flex items-center gap-2 bg-brand-100 text-brand px-5 py-2.5 rounded-full text-base font-semibold">
                    <Monitor className="h-4 w-4" />
                    Online Consults
                  </div>
                  <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-5 py-2.5 rounded-full text-base font-semibold">
                    <Building2 className="h-4 w-4" />
                    Clinic Visits
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-[1400px] mx-auto">
                {serviceCards.map((service, index) => (
                  <motion.article
                    key={service.number}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.08 }}
                    className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col"
                  >
                    <div className="relative h-44 bg-slate-200 overflow-hidden">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4 bg-brand text-white text-2xl font-black px-3 py-1.5 rounded-xl leading-none">
                        {service.number}
                      </div>
                    </div>

                    <div className="p-5 md:p-6 flex flex-col flex-1">
                      <h4 className="text-[1.7rem] md:text-[2rem] font-extrabold text-brand-800 leading-[1.08] tracking-tight min-h-[3.8rem] md:min-h-[4.4rem]">
                        {service.title}
                      </h4>
                      <p className="mt-3 text-slate-600 leading-relaxed text-sm md:text-base">{service.description}</p>
                      <Link to="/signup" className="inline-flex items-center gap-2 mt-auto pt-6 text-brand font-semibold hover:underline">
                        Book Now
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </motion.article>
                ))}
              </div>

              <div className="mt-10 text-center">
                <Link to="/services">
                  <Button className="bg-brand hover:bg-brand-600 text-white gap-2 px-7 py-5 text-sm md:text-base">
                    View All Services
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

  <section className="py-12 md:py-16 bg-slate-50">
        <div className="container">
          <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-r from-[#173c50] via-[#133649] to-[#173c50] px-6 py-12 md:px-12 md:py-16 text-center shadow-xl">
            <div className="flex justify-center">
              <Quote className="h-14 w-14 md:h-16 md:w-16 text-brand-100/85 stroke-[2.5]" aria-hidden="true" />
            </div>

            <blockquote className="mt-5 text-xl md:text-[2.1rem] text-white/95 italic leading-[1.35] max-w-4xl mx-auto">
              “I struggled for years, but with Nuwendo’s doctor-led plan I finally found what works for my body. I’m losing
              weight safely, my energy is up, and I feel supported every step.”
            </blockquote>

            <div className="mx-auto mt-8 h-1 w-16 rounded-full bg-brand-100/70" />
            <p className="mt-6 text-xs md:text-sm uppercase tracking-[0.18em] text-brand-100/85 font-medium">
              Why Patients Choose Nuwendo
            </p>
          </div>
        </div>
      </section>

  <section className="py-14 md:py-24 bg-slate-50">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <p className="text-brand-700 font-semibold uppercase tracking-[0.16em] text-sm md:text-base">
                DOCTOR-LED RESULTS
              </p>
              <h3 className="mt-4 text-3xl md:text-6xl font-black uppercase italic leading-[0.95] text-brand-800">
                What Makes Nuwendo Different?
              </h3>
              <p className="mt-6 text-base md:text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
                While there are many ways to lose weight, Nuwendo focuses on what matters most your biology, your health,
                and your long-term success.
              </p>
            </div>

            <div className="mt-12 grid lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 md:p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                <UsersRound className="h-14 w-14 text-brand mb-5" />
                <h4 className="text-3xl md:text-5xl font-black uppercase italic leading-tight text-brand-800 min-h-[7rem] md:min-h-[10.5rem]">
                  Doctor-Led Care For Everyone
                </h4>
                <p className="text-slate-700 mt-6 text-base md:text-xl leading-relaxed flex-1">
                  Whether you’re managing obesity, PCOS, thyroid issues, or just seeking safe weight loss, our programs are
                  guided by licensed doctors.
                </p>
                <Link to="/signup" className="inline-block mt-8 text-brand text-xl md:text-2xl hover:underline">
                  Book Now
                </Link>
              </div>

              <div className="bg-white p-6 md:p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                <Percent className="h-14 w-14 text-brand mb-5" />
                <h4 className="text-3xl md:text-5xl font-black uppercase italic leading-tight text-brand-800 min-h-[7rem] md:min-h-[10.5rem]">
                  Structured Programs & Packages
                </h4>
                <p className="text-slate-700 mt-6 text-base md:text-xl leading-relaxed flex-1">
                  Choose from our Initial Consultation or Starter Package, designed for different needs and goals, with
                  bundled savings.
                </p>
                <Link to="/services" className="inline-block mt-8 text-brand text-xl md:text-2xl hover:underline">
                  Inquire Now
                </Link>
              </div>

              <div className="bg-white p-6 md:p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                <HeartPulse className="h-14 w-14 text-brand mb-5" />
                <h4 className="text-3xl md:text-5xl font-black uppercase italic leading-tight text-brand-800 min-h-[7rem] md:min-h-[10.5rem]">
                  Focus On Long-Term Health
                </h4>
                <p className="text-slate-700 mt-6 text-base md:text-xl leading-relaxed flex-1">
                  No quick fixes, just science-backed care to improve your metabolism, balance your hormones, and support
                  long-term health and wellness.
                </p>
                <Link to="/signup" className="inline-block mt-8 text-brand text-xl md:text-2xl hover:underline">
                  Book Your Consultation
                </Link>
              </div>
            </div>

            <p className="text-center text-lg md:text-3xl text-brand-700 mt-10 md:mt-14">
              Book Your First Consultation Today. <Link to="/signup" className="font-bold text-brand hover:underline">Get Started Now!</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="bg-brand-900 py-8 border-t border-brand-700">
        <div className="container overflow-hidden">
          <motion.div
            className="flex w-max items-center gap-14 whitespace-nowrap"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 20, ease: 'linear', repeat: Infinity }}
          >
            {[...rotatingLines, ...rotatingLines, ...rotatingLines].map((line, idx) => (
              <div key={`${line}-${idx}`} className="inline-flex items-center gap-3 text-brand-100/90 text-xl md:text-2xl font-medium">
                <MessagesSquare className="h-5 w-5" />
                <span>{line}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  )
}
