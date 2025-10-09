import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Check } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { storage } from "@/lib/storage";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

interface QuestionPack {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  price: number;
  isOwned: boolean;
  isFree: boolean;
}

const stripePromise = loadStripe("pk_test_51SFN2aAs5y9yvA4t1e0Z3TpiEoLpFiPlJanPqUYXfLP878NYYT4GsOM8KPaALbYjdpP36eYfa7xyFlL6IDwDZss0008Z7co5NA");

export default function Store() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ownedPacks, setOwnedPacks] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const packs: QuestionPack[] = [
    {
      id: "pop_culture",
      name: "Pop Culture Pack",
      description: "125+ questions about movies, music, celebrities, and internet culture",
      questionCount: 125,
      price: 0,
      isOwned: true,
      isFree: true,
    },
    {
      id: "history",
      name: "History Pack",
      description: "Explore historical events, figures, and civilizations from ancient to modern times",
      questionCount: 100,
      price: 4.99,
      isOwned: false,
      isFree: false,
    },
    {
      id: "science",
      name: "Science Pack",
      description: "Dive into biology, chemistry, physics, and fascinating scientific discoveries",
      questionCount: 100,
      price: 4.99,
      isOwned: false,
      isFree: false,
    },
    {
      id: "sports",
      name: "Sports Pack",
      description: "Test your knowledge of athletes, championships, records, and sports trivia",
      questionCount: 100,
      price: 4.99,
      isOwned: false,
      isFree: false,
    },
    {
      id: "geography",
      name: "Geography Pack",
      description: "Journey through countries, capitals, landmarks, and natural wonders",
      questionCount: 100,
      price: 4.99,
      isOwned: false,
      isFree: false,
    },
    {
      id: "food",
      name: "Food & Drink Pack",
      description: "Delicious questions about cuisines, recipes, ingredients, and culinary traditions",
      questionCount: 80,
      price: 3.99,
      isOwned: false,
      isFree: false,
    },
  ];

  useEffect(() => {
    const owned = storage.getOwnedPacks();
    setOwnedPacks(owned);

    // Check for successful payment
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const packId = urlParams.get('pack');
    
    if (success === 'true' && packId) {
      storage.addOwnedPack(packId);
      setOwnedPacks([...owned, packId]);
      toast.success('Purchase successful! Your pack has been added to your collection.');
      // Clean up URL
      window.history.replaceState({}, '', '/store');
    } else if (urlParams.get('canceled') === 'true') {
      toast.error('Payment was canceled.');
      window.history.replaceState({}, '', '/store');
    }
  }, []);

  const handlePurchase = async (pack: QuestionPack) => {
    if (pack.isFree) {
      storage.addOwnedPack(pack.id);
      setOwnedPacks([...ownedPacks, pack.id]);
      toast.success(`${pack.name} added to your collection!`);
      return;
    }
    
    if (pack.isOwned) return;
    
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          packId: pack.id,
          packName: pack.name,
          price: pack.price,
        },
      });

      if (error) throw error;

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Failed to process payment. Please try again.');
      setIsProcessing(false);
    }
  };

  const isPackOwned = (packId: string) => {
    return ownedPacks.includes(packId) || packId === "pop_culture";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Question Deck Store
              </h1>
              <p className="text-muted-foreground mt-1">
                Expand your game with new question packs
              </p>
            </div>
          </div>
        </div>

        {/* Packs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.map((pack) => {
            const owned = isPackOwned(pack.id);
            
            return (
              <Card key={pack.id} className={owned ? "border-primary/50" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">{pack.name}</CardTitle>
                    </div>
                    {owned && (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        Owned
                      </Badge>
                    )}
                    {pack.isFree && !owned && (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </div>
                  <CardDescription className="mt-2">
                    {pack.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {pack.questionCount} questions
                    </span>
                    {!pack.isFree && (
                      <span className="text-2xl font-bold text-primary">
                        ${pack.price}
                      </span>
                    )}
                  </div>
                </CardContent>

                <CardFooter>
                  {owned ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Check className="mr-2 h-4 w-4" />
                      In Your Collection
                    </Button>
                  ) : pack.isFree ? (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handlePurchase(pack)}
                    >
                      Get Free Pack
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handlePurchase(pack)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : `Purchase for $${pack.price}`}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Coming Soon */}
        <div className="mt-12 text-center">
          <div className="inline-block p-6 rounded-lg bg-muted/50">
            <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">More Packs Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              We're working on more exciting question packs. Check back regularly!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
