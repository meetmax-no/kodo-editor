import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { Card } from './ui/card';

/**
 * Pricing — viser prisliste + studenttilbud.
 *
 * Datakilder:
 *   /data/priser.json          — { prisliste: [{ kategori, tjenester: [...] }] }
 *   /data/priser-student.json  — { studenttilbud: { aktiv, pakke, rabatt_ovrig, merknad } }
 *
 * Studenttilbudet skjules helt hvis aktiv=false, eller fila mangler.
 */

// Hjelper: parse "<label>: <pris>" → { label, price }. Faller tilbake til hel-string.
const splitLabelPrice = (str, separators = [':', '-']) => {
  if (!str || typeof str !== 'string') return { label: '', price: '' };
  for (const sep of separators) {
    const idx = str.lastIndexOf(sep);
    if (idx > 0 && idx < str.length - 1) {
      const right = str.slice(idx + 1).trim();
      // Bekreft at høyresiden ser ut som en pris (inneholder tall)
      if (/\d/.test(right)) {
        return { label: str.slice(0, idx).trim(), price: right };
      }
    }
  }
  return { label: str.trim(), price: '' };
};

// Hjelper: parse "15% rabatt på øvrig behandling" → { price: "15%", label: "Rabatt på øvrig behandling" }
const splitPriceLabel = (str) => {
  if (!str || typeof str !== 'string') return { label: '', price: '' };
  const match = str.match(/^(\d+\s*[%,.\-kr]+|\d+)\s+(.+)$/i);
  if (match) {
    const label = match[2].trim();
    return {
      price: match[1].trim(),
      label: label.charAt(0).toUpperCase() + label.slice(1),
    };
  }
  return { label: str.trim(), price: '' };
};

export const Pricing = () => {
  const [priceList, setPriceList] = useState([]);
  const [studentOffer, setStudentOffer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/data/priser.json').then((r) => {
        if (!r.ok) throw new Error('priser.json mangler');
        return r.json();
      }),
      // priser-student.json er valgfri — fanger fail og gir null
      fetch('/data/priser-student.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([priserData, studentData]) => {
        const formattedData = priserData.prisliste.map((category) => ({
          category: category.kategori,
          items: category.tjenester.map((item) => ({
            service: item.tjeneste,
            price: item.pris,
          })),
        }));
        setPriceList(formattedData);

        const offer = studentData?.studenttilbud;
        if (offer && offer.aktiv) {
          setStudentOffer(offer);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Feil ved lasting av priser:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section id="priser" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">Laster priser...</p>
        </div>
      </section>
    );
  }

  // Forhåndsparse studenttilbud for ryddig JSX nedenfor
  const pakke = studentOffer ? splitLabelPrice(studentOffer.pakke) : null;
  const rabatt = studentOffer ? splitPriceLabel(studentOffer.rabatt_ovrig) : null;

  return (
    <section id="priser" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">
            Priser
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Oversikt over våre tjenester og priser. Kontakt oss for mer informasjon.
          </p>
        </div>

        <Card className="border-2 border-amber-100 shadow-lg">
          <Accordion type="single" collapsible className="w-full">
            {priceList.map((category, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-amber-900 hover:text-amber-700 hover:no-underline">
                  {category.category}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-6 pb-4 space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex justify-between items-center py-3 border-b border-amber-50 last:border-0"
                      >
                        <span className="text-gray-700 font-medium">{item.service}</span>
                        <span className="text-amber-800 font-semibold">{item.price}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        {/* Student Offer Highlight — kun synlig hvis studenttilbud.aktiv = true */}
        {studentOffer && (
          <div className="mt-8 bg-gradient-to-br from-blue-50 to-blue-100/50 border-3 border-blue-400 rounded-2xl p-8 shadow-xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                <span className="text-3xl">🎓</span>
              </div>
              <h3 className="text-3xl font-bold text-blue-900 mb-4">
                Studenttilbud
              </h3>
              <div className="max-w-2xl mx-auto space-y-4">
                {pakke && (pakke.label || pakke.price) && (
                  <div className="bg-white rounded-xl p-6 shadow-md">
                    {pakke.label && (
                      <p className="text-gray-700 text-lg mb-2">
                        <strong className="text-blue-800">{pakke.label}</strong>
                      </p>
                    )}
                    {pakke.price && (
                      <p className="text-4xl font-bold text-blue-900">{pakke.price}</p>
                    )}
                  </div>
                )}
                {rabatt && (rabatt.label || rabatt.price) && (
                  <div className="bg-white rounded-xl p-6 shadow-md">
                    {rabatt.label && (
                      <p className="text-gray-700 text-lg mb-2">
                        <strong className="text-blue-800">{rabatt.label}</strong>
                      </p>
                    )}
                    {rabatt.price && (
                      <p className="text-4xl font-bold text-blue-900">{rabatt.price}</p>
                    )}
                  </div>
                )}
              </div>
              {studentOffer.merknad && (
                <p className="text-gray-600 mt-6 italic">
                  {studentOffer.merknad}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Prisene er veiledende. Kontakt oss for et nøyaktig pristilbud basert på dine behov.
          </p>
        </div>
      </div>
    </section>
  );
};
