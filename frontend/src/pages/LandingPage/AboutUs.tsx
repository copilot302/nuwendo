import { CheckCircle2 } from 'lucide-react'

export function AboutUs() {
  return (
    <section id="about" className="py-20 bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <p className="text-brand font-semibold tracking-wide uppercase mb-3">About Nuwendo</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-brand-800 leading-tight">
                Doctor-Led Weight Loss & Metabolic Health Clinic in the Philippines
              </h2>
              <p className="mt-6 text-slate-700 leading-relaxed text-lg">
                At Nuwendo, we go beyond fad diets and quick fixes. Led by board-certified doctors in endocrinology and nutrition,
                we provide personalized, medically guided weight management tailored to your unique biology.
                From consultations to advanced GLP-1 care, our mission is to help you achieve sustainable results with real medical support.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white/90 backdrop-blur border-l-4 border-brand rounded-2xl p-6 shadow-md">
                <p className="text-brand-800 text-sm font-semibold uppercase tracking-wide">Nuwendo Care Model</p>
                <ul className="mt-4 space-y-3 text-slate-700">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                    <span>Medical diagnosis first, not generic programs.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                    <span>Plans customized for metabolism, lifestyle, and labs.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                    <span>Ongoing doctor support for long-term outcomes.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-14">
            <h3 className="text-2xl md:text-3xl font-bold text-brand-800 text-center">
              What Makes Nuwendo Different?
            </h3>
            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              {['Board-certified doctors', 'Personalized medical care', 'More than weight loss'].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-slate-300 bg-white text-slate-700"
                >
                  <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <p className="text-brand font-semibold uppercase tracking-wide">Our Philosophy</p>
              <h4 className="text-3xl font-bold text-brand-800 mt-2">Beginning with your biology.</h4>
              <p className="text-slate-700 mt-4 leading-relaxed">
                Real change starts with understanding your metabolism, hormones, and habits. We build plans that are realistic,
                compassionate, and clinically grounded.
              </p>
            </div>

            <div className="lg:col-span-8 relative pl-8 border-l-2 border-slate-200 space-y-10">
              {[
                {
                  step: '01',
                  title: 'Science before trends',
                  body:
                    'We don’t rely on fads. Every recommendation is based on evidence, your medical profile, and expert physician guidance.',
                },
                {
                  step: '02',
                  title: 'Health is your greatest wealth',
                  body:
                    'Weight management is not just about appearance. It is about better energy, reduced risk, and a healthier life you can sustain.',
                },
                {
                  step: '03',
                  title: 'Doctor-led quality of care',
                  body:
                    'Our team combines endocrinology, nutrition, and internal medicine expertise to guide every step of your journey.',
                },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <div className="absolute -left-[44px] top-1 h-8 w-8 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                  <h5 className="text-2xl font-bold text-brand-800">{item.title}</h5>
                  <p className="text-slate-700 mt-2 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 bg-brand-900 rounded-3xl px-6 py-10 md:px-10 md:py-12 text-center">
            <p className="text-slate-200 text-sm uppercase tracking-[0.2em]">Nuwendo Motto</p>
            <p className="text-white text-3xl md:text-4xl font-extrabold mt-3">The greatest wealth is health.</p>
            <p className="text-slate-200 max-w-3xl mx-auto mt-4 leading-relaxed">
              We help patients build healthier lives through medical precision, nutrition support, and consistent follow-through.
            </p>
          </div>

          <div className="mt-16 md:mt-20">
            <h3 className="text-3xl md:text-5xl font-extrabold italic uppercase text-center text-red-500 leading-tight mb-6">
              Proud of our team of doctor-led metabolic health specialists
            </h3>
            <p className="text-slate-700 leading-relaxed text-center max-w-4xl mx-auto">
              At Nuwendo, we’re led by board-certified doctors in endocrinology, nutrition, and internal medicine.
              Our team is united by one mission: to help patients achieve safe, sustainable weight management through personalized,
              science-backed care.
            </p>

            <div className="grid md:grid-cols-2 gap-10 md:gap-16 place-items-center mt-10">
              <div className="text-center">
                <div className="w-60 h-60 md:w-72 md:h-72 rounded-full overflow-hidden mx-auto bg-slate-100 ring-8 ring-white shadow-2xl">
                  <img
                    src="/ivan-photo.png"
                    alt="Dr. Ivan Zapanta"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="mt-6 font-extrabold text-3xl italic uppercase text-brand-800 tracking-wide">Dr. Ivan Zapanta</p>
                <p className="text-slate-500 text-xl">Founder</p>
              </div>

              <div className="text-center">
                <div className="w-60 h-60 md:w-72 md:h-72 rounded-full overflow-hidden mx-auto bg-slate-100 ring-8 ring-white shadow-2xl">
                  <img
                    src="/calvin_photo_1500x1500.jpg"
                    alt="Dr. Calvin Macrohon"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="mt-6 font-extrabold text-3xl italic uppercase text-brand-800 tracking-wide">Dr. Calvin Macrohon</p>
                <p className="text-slate-500 text-xl">Co-Founder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
