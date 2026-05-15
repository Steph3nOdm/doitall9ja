import { useMemo, useState } from 'react';
import { Search, LifeBuoy } from 'lucide-react';
import { faqItems, type FaqItem } from '@/data/faqData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function FAQPage() {
  const [search, setSearch] = useState('');

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return faqItems;

    return faqItems.filter((faq) =>
      [faq.category, faq.question, faq.answer].some((value) => value.toLowerCase().includes(query))
    );
  }, [search]);

  const groupedFaqs = useMemo(() => {
    const grouped = new Map<string, FaqItem[]>();
    filteredFaqs.forEach((faq) => {
      if (!grouped.has(faq.category)) {
        grouped.set(faq.category, []);
      }
      grouped.get(faq.category)?.push(faq);
    });
    return grouped;
  }, [filteredFaqs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] px-4 py-10 md:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Frequently Asked Questions</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Quick answers for clients and technicians. Search by keyword or browse by category.
          </p>
        </div>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search FAQ by question, answer, or category"
                className="pl-10 bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
          </CardContent>
        </Card>

        {groupedFaqs.size === 0 ? (
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="py-10 text-center text-gray-400">
              No FAQ entries found for "{search}".
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedFaqs.entries()).map(([category, faqs]) => (
              <Card key={category} className="bg-[#1a1a1a] border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-lg">{category}</CardTitle>
                  <CardDescription className="text-gray-500">
                    {faqs.length} question{faqs.length > 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id} className="border-gray-800">
                        <AccordionTrigger className="text-white hover:text-[#00C853]">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-300 leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardContent className="py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-white font-medium">Still need help?</p>
                <p className="text-sm text-gray-400">
                  Contact support with your booking ID and issue details.
                </p>
              </div>
              <Button asChild className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold">
                <a href="https://wa.me/message/Z2GPKICB6VLAF1" target="_blank" rel="noreferrer">
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  Contact Support
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


