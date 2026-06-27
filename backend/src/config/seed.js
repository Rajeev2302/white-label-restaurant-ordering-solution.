/**
 * Seed the SQLite database with menu items and initial tables.
 * Maps high-quality representative Unsplash food images to items.
 * Excludes soft drinks, water, and rice from having images.
 */
export async function seedDatabase(db) {
  console.log('[Seed] Seeding menu items with high-quality representative food images...');

  const getImageForCategory = (name, category) => {
    const ln = name.toLowerCase();
    const lc = category.toLowerCase();

    // 1. Exclude water, soft drinks/cool drinks from getting standard images (use default placeholder)
    if (
      ln.includes('water') || 
      ln.includes('soda') || 
      ln.includes('drink') || 
      ln.includes('bottle') ||
      lc.includes('cool drinks')
    ) {
      return '/images/placeholder.jpg';
    }

    // 2. Biryani mappings
    if (ln.includes('biryani') || ln.includes('biriyani')) {
      if (ln.includes('egg')) return '/images/Egg-biriyani.jpg';
      if (ln.includes('baby corn')) return '/images/baby-corn-biriyani.jpg';
      if (ln.includes('chicken')) {
        if (ln.includes('moghalai')) return '/images/chicken-moghalai-biriyani.jpg';
        return '/images/chicken-biriyani.jpg';
      }
      if (ln.includes('mutton')) return '/images/mutton-biriyani.jpg';
      if (ln.includes('mushroom')) return '/images/mushroom-biriyani.jpg';
      if (ln.includes('paneer')) return '/images/paneer-biriyani.jpg';
      if (ln.includes('mixed nonveg') || ln.includes('mixed non veg') || ln.includes('mixed non-veg')) return '/images/mixed-nonveg-biriyani.jpg';
      if (ln.includes('veg')) return '/images/veg-biriyani.jpg';
      if (lc.includes('non veg') || lc.includes('nonveg')) return '/images/chicken-biriyani.jpg';
      return '/images/veg-biriyani.jpg';
    }

    // 3. Fried Rice mappings
    if (ln.includes('fried rice')) {
      if (lc.includes('non veg') || lc.includes('nonveg') || ln.includes('chicken') || ln.includes('egg') || ln.includes('prawn')) {
        return '/images/chicken-fried-rice.jpg';
      }
      return '/images/veg-fried-rice.jpg';
    }

    // 4. Rice mappings (Special Rice / Curd Rice / Plain Rice)
    if (ln.includes('curd rice')) return '/images/curd-rice.jpg';
    if (ln.includes('pudina rice')) return '/images/pudina-rice.jpg';
    if (ln.includes('white rice')) return '/images/white-rice.jpg';
    if (ln.includes('jeera rice')) return '/images/white-rice.jpg';

    // 5. Kabab / Tandoori / Tikka
    if (ln.includes('angara kabab')) return '/images/angara-kabab-bone.jpg';
    if (ln.includes('tandoori chicken')) return '/images/chicken-tandoori.jpg';
    if (ln.includes('chicken tikka')) return '/images/chicken-tikka.jpg';
    if (ln.includes('paneer tikka')) return '/images/paneer-curry.jpg';
    if (ln.includes('kalmi kabab')) return '/images/angara-kabab-bone.jpg';

    // 6. Chicken Starters (Lollipop, majestic, 65, chilli, etc.)
    if (lc.includes('non veg starters') || ln.includes('chicken')) {
      if (ln.includes('lollipop') || ln.includes('lolipop')) return '/images/chicken-lolipop.jpg';
      if (ln.includes('chilli')) return '/images/chilli-chicken.jpg';
      if (ln.includes('65')) return '/images/chicken-65.jpg';
      return '/images/chicken-65.jpg'; 
    }

    // 7. Paneer / Veg Starters / Curries
    if (ln.includes('paneer') || ln.includes('panner')) {
      if (ln.includes('butter') || ln.includes('masala')) return '/images/paneer-butter-masala.jpg';
      return '/images/paneer-curry.jpg';
    }
    if (ln.includes('manchuriya') || ln.includes('manchurian')) {
      if (ln.includes('egg')) return '/images/egg-munchuria.jpg';
      if (ln.includes('paneer')) return '/images/paneer-curry.jpg';
      if (ln.includes('mushroom')) return '/images/mushroom-curry.jpg';
      return '/images/egg-munchuria.jpg';
    }
    if (ln.includes('mushroom')) {
      if (ln.includes('curry') || ln.includes('masala')) return '/images/mushroom-curry.jpg';
      return '/images/mushroom-curry.jpg';
    }
    if (ln.includes('cashew') || ln.includes('tomato')) {
      return '/images/tomato-cashew-curry.jpg';
    }

    // 8. Non-Veg Curries (Chicken / Mutton / Egg)
    if (lc.includes('non veg curries') || ln.includes('curry')) {
      if (ln.includes('butter chicken')) return '/images/butter-chicken.jpg';
      if (ln.includes('chicken')) return '/images/chicken-curry.jpg';
      if (ln.includes('mutton')) return '/images/mutton-curry.jpg';
      if (ln.includes('egg') || ln.includes('anda')) {
        if (ln.includes('kheema') || ln.includes('keema')) return '/images/egg-kheema.jpg';
        return '/images/boiled-egg.jpg';
      }
    }

    // 9. Egg items
    if (lc.includes('egg') || ln.includes('egg') || ln.includes('omelet') || ln.includes('omlet') || ln.includes('anda')) {
      if (ln.includes('65')) return '/images/egg-65.jpg';
      if (ln.includes('manchuria') || ln.includes('manchuriya')) return '/images/egg-munchuria.jpg';
      if (ln.includes('boiled')) return '/images/boiled-egg.jpg';
      if (ln.includes('omelet') || ln.includes('omlet')) return '/images/omlet.jpg';
      return '/images/boiled-egg.jpg';
    }

    // 10. Prawns
    if (lc.includes('prawn') || ln.includes('prawn')) {
      if (ln.includes('chilli')) return '/images/chilli-prawns.jpg';
      return '/images/prawns-fry.jpg';
    }

    // 11. Fish
    if (lc.includes('fish') || ln.includes('fish')) {
      if (ln.includes('apollo')) return '/images/apolo-fish.jpg';
      return '/images/fish-fry.jpg';
    }

    // 12. Rotis and Naan
    if (lc.includes('roti') || ln.includes('naan') || ln.includes('pulka') || ln.includes('kulcha')) {
      if (ln.includes('naan')) return '/images/butter-naan.jpg';
      return '/images/tandoor-roti.jpg';
    }

    // 13. Mutton / Special items fallback
    if (ln.includes('mutton') || ln.includes('boti') || ln.includes('talakai')) {
      return '/images/mutton-curry.jpg';
    }

    // Default fallback
    return '/images/placeholder.jpg';
  };

  const menuItems = [
    // 1. Veg Starters
    { name: 'Veg Manchuriya', price: 150, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Baby Corn Manchuriya', price: 180, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Mushroom Manchuriya', price: 180, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Paneer Manchuriya', price: 180, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Baby Corn 65', price: 180, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Paneer 65', price: 180, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Mushroom 65', price: 180, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Chilli Mushrooms', price: 180, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Chilli Paneer', price: 180, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Chilli Baby Corn', price: 180, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Cashew Fry', price: 250, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },
    { name: 'Crispy Corn', price: 150, category: 'Veg Starters', subcategory: 'Veg Starters', is_veg: 1 },

    // 2. Non Veg Starters
    { name: 'Chicken 65', price: 180, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chilli Chicken', price: 180, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken Fry Boneless', price: 200, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken Manchuriya', price: 180, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Garlic Chicken', price: 220, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Liver Fry', price: 130, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken Lollipop 4 Piece', price: 200, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken Lollipop 6 Piece', price: 280, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken Roast Bone Fry', price: 170, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken Wings', price: 200, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken Majestic', price: 230, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken 555', price: 230, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Pepper Chicken', price: 230, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Dragon Chicken', price: 230, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Cashew Chicken', price: 250, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken Hangkon', price: 240, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken Joint 2 Piece', price: 140, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Chicken Joint 4 Piece', price: 280, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },
    { name: 'Natukodi Fry', price: 320, category: 'Non Veg Starters', subcategory: 'Non Veg Starters', is_veg: 0 },

    // 3. Tandoori Starters
    { name: 'Tandoori Chicken Half', price: 249, category: 'Tandoori Starters', subcategory: 'Tandoori Starters', is_veg: 0 },
    { name: 'Tandoori Chicken Full', price: 499, category: 'Tandoori Starters', subcategory: 'Tandoori Starters', is_veg: 0 },
    { name: 'Kalmi Kabab 2 Piece', price: 199, category: 'Tandoori Starters', subcategory: 'Tandoori Starters', is_veg: 0 },
    { name: 'Kalmi Kabab 4 Piece', price: 399, category: 'Tandoori Starters', subcategory: 'Tandoori Starters', is_veg: 0 },
    { name: 'Angara Kabab Bone 4 Piece', price: 199, category: 'Tandoori Starters', subcategory: 'Tandoori Starters', is_veg: 0 },
    { name: 'Angara Kabab Bone 8 Piece', price: 399, category: 'Tandoori Starters', subcategory: 'Tandoori Starters', is_veg: 0 },
    { name: 'Chicken Tikka 4 Piece', price: 149, category: 'Tandoori Starters', subcategory: 'Tandoori Starters', is_veg: 0 },
    { name: 'Chicken Tikka 8 Piece', price: 249, category: 'Tandoori Starters', subcategory: 'Tandoori Starters', is_veg: 0 },
    { name: 'Paneer Tikka', price: 249, category: 'Tandoori Starters', subcategory: 'Tandoori Starters', is_veg: 1 },

    // 4. Veg Biryanis
    { name: 'Plain Biryani', price: 120, category: 'Veg Biryanis', subcategory: 'Veg Biryanis', is_veg: 1 },
    { name: 'Veg Biryani', price: 150, category: 'Veg Biryanis', subcategory: 'Veg Biryanis', is_veg: 1 },
    { name: 'Paneer Biryani', price: 200, category: 'Veg Biryanis', subcategory: 'Veg Biryanis', is_veg: 1 },
    { name: 'Mushroom Biryani', price: 200, category: 'Veg Biryanis', subcategory: 'Veg Biryanis', is_veg: 1 },
    { name: 'Veg Manchurian Biryani', price: 200, category: 'Veg Biryanis', subcategory: 'Veg Biryanis', is_veg: 1 },
    { name: 'Baby Corn Biryani', price: 200, category: 'Veg Biryanis', subcategory: 'Veg Biryanis', is_veg: 1 },
    { name: 'Cashew Paneer Biryani', price: 250, category: 'Veg Biryanis', subcategory: 'Veg Biryanis', is_veg: 1 },
    { name: 'Cashew Mushroom Biryani', price: 250, category: 'Veg Biryanis', subcategory: 'Veg Biryanis', is_veg: 1 },
    { name: 'Special Veg Biryani', price: 220, category: 'Veg Biryanis', subcategory: 'Veg Biryanis', is_veg: 1 },
    { name: 'Mixed Veg Biryani', price: 280, category: 'Veg Biryanis', subcategory: 'Veg Biryanis', is_veg: 1 },

    // 5. Non Veg Biryanis
    { name: 'Chicken Fry Piece Biryani', price: 180, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Chicken Dum Biryani', price: 200, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Chicken Biryani Half', price: 120, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Lollipop Biryani 3 Pieces', price: 270, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Chicken Joint Biryani 2 Pieces', price: 260, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Special Chicken Biryani', price: 230, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Chicken Moghalai Biryani', price: 260, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Fish Biryani', price: 240, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Prawns Biryani', price: 250, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Chicken Wings Biryani', price: 240, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Mutton Biryani', price: 300, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Mutton Moghalai Biryani', price: 350, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Mixed Nonveg Biryani', price: 320, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Egg Biryani', price: 150, category: 'Non Veg Biryanis', subcategory: 'Non Veg Biryanis', is_veg: 0 },
    { name: 'Dhilkush Biryani', price: 400, category: 'Non Veg Biryanis', subcategory: 'Special Biryanis', is_veg: 0 },
    { name: 'Potlam Biryani', price: 380, category: 'Non Veg Biryanis', subcategory: 'Special Biryanis', is_veg: 0 },
    { name: 'LG Special Biryani', price: 600, category: 'Non Veg Biryanis', subcategory: 'Special Biryanis', is_veg: 0 },
    { name: 'LG Special Biryani Full', price: 999, category: 'Non Veg Biryanis', subcategory: 'Special Biryanis', is_veg: 0 },

    // 6. Veg Fried Rice
    { name: 'Veg Fried Rice', price: 140, category: 'Veg Fried Rice', subcategory: 'Veg Fried Rice', is_veg: 1 },
    { name: 'Mushroom Fried Rice', price: 200, category: 'Veg Fried Rice', subcategory: 'Veg Fried Rice', is_veg: 1 },
    { name: 'Paneer Fried Rice', price: 200, category: 'Veg Fried Rice', subcategory: 'Veg Fried Rice', is_veg: 1 },
    { name: 'Cashew Fried Rice', price: 250, category: 'Veg Fried Rice', subcategory: 'Veg Fried Rice', is_veg: 1 },
    { name: 'Sweet Corn Fried Rice', price: 170, category: 'Veg Fried Rice', subcategory: 'Veg Fried Rice', is_veg: 1 },
    { name: 'Cashew Paneer Fried Rice', price: 250, category: 'Veg Fried Rice', subcategory: 'Veg Fried Rice', is_veg: 1 },
    { name: 'Cashew Mushroom Fried Rice', price: 250, category: 'Veg Fried Rice', subcategory: 'Veg Fried Rice', is_veg: 1 },
    { name: 'Special Veg Fried Rice', price: 220, category: 'Veg Fried Rice', subcategory: 'Veg Fried Rice', is_veg: 1 },
    { name: 'Mixed Veg Fried Rice', price: 280, category: 'Veg Fried Rice', subcategory: 'Veg Fried Rice', is_veg: 1 },

    // 7. Non Veg Fried Rice
    { name: 'Egg Fried Rice', price: 150, category: 'Non Veg Fried Rice', subcategory: 'Non Veg Fried Rice', is_veg: 0 },
    { name: 'Double Egg Fried Rice', price: 180, category: 'Non Veg Fried Rice', subcategory: 'Non Veg Fried Rice', is_veg: 0 },
    { name: 'Chicken Fried Rice', price: 180, category: 'Non Veg Fried Rice', subcategory: 'Non Veg Fried Rice', is_veg: 0 },
    { name: 'Double Egg Chicken Fried Rice', price: 200, category: 'Non Veg Fried Rice', subcategory: 'Non Veg Fried Rice', is_veg: 0 },
    { name: 'Cashew Egg Fried Rice', price: 220, category: 'Non Veg Fried Rice', subcategory: 'Non Veg Fried Rice', is_veg: 0 },
    { name: 'Cashew Chicken Fried Rice', price: 250, category: 'Non Veg Fried Rice', subcategory: 'Non Veg Fried Rice', is_veg: 0 },
    { name: 'Prawns Fried Rice', price: 230, category: 'Non Veg Fried Rice', subcategory: 'Non Veg Fried Rice', is_veg: 0 },
    { name: 'Special Prawns Fried Rice', price: 250, category: 'Non Veg Fried Rice', subcategory: 'Non Veg Fried Rice', is_veg: 0 },
    { name: 'Non Veg Mixed Fried Rice', price: 300, category: 'Non Veg Fried Rice', subcategory: 'Non Veg Fried Rice', is_veg: 0 },
    { name: 'Special Chicken Fried Rice', price: 230, category: 'Non Veg Fried Rice', subcategory: 'Non Veg Fried Rice', is_veg: 0 },

    // 8. Veg Curries
    { name: 'Paneer Butter Masala', price: 180, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },
    { name: 'Mushroom Masala', price: 180, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },
    { name: 'Baby Corn Masala', price: 180, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },
    { name: 'Cashew Tomato Curry', price: 180, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },
    { name: 'Cashew Paneer Curry', price: 200, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },
    { name: 'Cashew Mushroom Curry', price: 220, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },
    { name: 'Mixed Veg Curry', price: 160, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },
    { name: 'Paneer Bujji', price: 200, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },
    { name: 'Green Piece Masala', price: 150, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },
    { name: 'Kaddi Paneer', price: 200, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },
    { name: 'Methi Chaman Curry', price: 200, category: 'Veg Curries', subcategory: 'Veg Curries', is_veg: 1 },

    // 9. Non Veg Curries
    { name: 'Chicken Curry', price: 150, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Chicken Curry Boneless', price: 180, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Ginger Chicken Boneless', price: 220, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Chicken Moghalai Curry', price: 220, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Special Chicken Curry', price: 220, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Butter Chicken', price: 200, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Kadai Chicken', price: 210, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Mutton Curry', price: 280, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Fish Curry 2 Pieces', price: 120, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Prawns Curry', price: 200, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Anda Burji', price: 100, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Anda Keema Curry', price: 120, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },
    { name: 'Anda Curry', price: 100, category: 'Non Veg Curries', subcategory: 'Non Veg Curries', is_veg: 0 },

    // 10. Tandoori Rotis
    { name: 'Aashirwad Pulka', price: 10, category: 'Tandoori Rotis', subcategory: 'Tandoori Rotis', is_veg: 1 },
    { name: 'Butter Pulka', price: 15, category: 'Tandoori Rotis', subcategory: 'Tandoori Rotis', is_veg: 1 },
    { name: 'Plain Naan', price: 30, category: 'Tandoori Rotis', subcategory: 'Tandoori Rotis', is_veg: 1 },
    { name: 'Butter Naan', price: 40, category: 'Tandoori Rotis', subcategory: 'Tandoori Rotis', is_veg: 1 },
    { name: 'Tandoori Roti Plain', price: 25, category: 'Tandoori Rotis', subcategory: 'Tandoori Rotis', is_veg: 1 },
    { name: 'Tandoori Roti Butter', price: 35, category: 'Tandoori Rotis', subcategory: 'Tandoori Rotis', is_veg: 1 },
    { name: 'Kulcha Plain', price: 35, category: 'Tandoori Rotis', subcategory: 'Tandoori Rotis', is_veg: 1 },
    { name: 'Kulcha Butter', price: 45, category: 'Tandoori Rotis', subcategory: 'Tandoori Rotis', is_veg: 1 },
    { name: 'Paneer Kulcha', price: 70, category: 'Tandoori Rotis', subcategory: 'Tandoori Rotis', is_veg: 1 },
    { name: 'Masala Kulcha', price: 60, category: 'Tandoori Rotis', subcategory: 'Tandoori Rotis', is_veg: 1 },

    // 11. Egg
    { name: 'Omelet', price: 80, category: 'Egg', subcategory: 'Egg', is_veg: 0 },
    { name: 'Egg Chilli', price: 120, category: 'Egg', subcategory: 'Egg', is_veg: 0 },
    { name: 'Egg 65', price: 120, category: 'Egg', subcategory: 'Egg', is_veg: 0 },
    { name: 'Egg Manchuria', price: 130, category: 'Egg', subcategory: 'Egg', is_veg: 0 },
    { name: 'Boiled Egg', price: 15, category: 'Egg', subcategory: 'Egg', is_veg: 0 },

    // 12. Prawns
    { name: 'Loose Prawns', price: 230, category: 'Prawns', subcategory: 'Prawns', is_veg: 0 },
    { name: 'Prawns Fry', price: 230, category: 'Prawns', subcategory: 'Prawns', is_veg: 0 },
    { name: 'Chilli Prawns', price: 230, category: 'Prawns', subcategory: 'Prawns', is_veg: 0 },
    { name: 'Pepper Prawns', price: 230, category: 'Prawns', subcategory: 'Prawns', is_veg: 0 },
    { name: 'Prawns 65', price: 230, category: 'Prawns', subcategory: 'Prawns', is_veg: 0 },

    // 13. Fish
    { name: 'Fish Roast 3 Pieces', price: 200, category: 'Fish', subcategory: 'Fish', is_veg: 0 },
    { name: 'Fish Fry 2 Pieces', price: 140, category: 'Fish', subcategory: 'Fish', is_veg: 0 },
    { name: 'Apollo Fish', price: 200, category: 'Fish', subcategory: 'Fish', is_veg: 0 },
    { name: 'Pithala Fry', price: 200, category: 'Fish', subcategory: 'Fish', is_veg: 0 },
    { name: 'Nethallu Roast', price: 200, category: 'Fish', subcategory: 'Fish', is_veg: 0 },

    // 14. Special Items
    { name: 'Konaseema Pitta', price: 120, category: 'Special Items', subcategory: 'Special Items', is_veg: 0 },
    { name: 'Boti Fry', price: 220, category: 'Special Items', subcategory: 'Special Items', is_veg: 0 },
    { name: 'Mutton Talakai Fry', price: 280, category: 'Special Items', subcategory: 'Special Items', is_veg: 0 },

    // 15. Family Packs
    { name: 'Family Pack', price: 649, category: 'Family Packs', subcategory: 'Family Packs', is_veg: 0 },

    // 16. Jumbo Packs
    { name: 'Jumbo Pack', price: 999, category: 'Jumbo Packs', subcategory: 'Jumbo Packs', is_veg: 0 },

    // 17. Party Packs
    { name: 'Party Pack', price: 1499, category: 'Party Packs', subcategory: 'Party Packs', is_veg: 0 },

    // 18. Special Rice
    { name: 'Curd Rice', price: 80, category: 'Special Rice', subcategory: 'Special Rice', is_veg: 1 },
    { name: 'Special Curd Rice', price: 110, category: 'Special Rice', subcategory: 'Special Rice', is_veg: 1 },
    { name: 'Jeera Rice', price: 130, category: 'Special Rice', subcategory: 'Special Rice', is_veg: 1 },
    { name: 'Pudina Rice', price: 150, category: 'Special Rice', subcategory: 'Special Rice', is_veg: 1 },
    { name: 'White Rice', price: 40, category: 'Special Rice', subcategory: 'Special Rice', is_veg: 1 },

    // 19. Cool Drinks
    { name: 'Water Bottle', price: 20, category: 'Cool Drinks', subcategory: 'Cool Drinks', is_veg: 1 },
    { name: 'Soda', price: 25, category: 'Cool Drinks', subcategory: 'Cool Drinks', is_veg: 1 },
    { name: '750ml Drinks', price: 50, category: 'Cool Drinks', subcategory: 'Cool Drinks', is_veg: 1 },
    { name: '2 Liter Drinks', price: 100, category: 'Cool Drinks', subcategory: 'Cool Drinks', is_veg: 1 }
  ];

  console.log('[Seed] Inserting menu items into PostgreSQL...');
  for (const item of menuItems) {
    const imageUrl = getImageForCategory(item.name, item.category);
    await db.query(
      `INSERT INTO menu_items (name, price, category, subcategory, is_veg, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [item.name, item.price, item.category, item.subcategory, item.is_veg, imageUrl]
    );
  }

  console.log(`[Seed] Successfully inserted ${menuItems.length} menu items.`);

  console.log('[Seed] Seeding initial dining tables...');
  const tableNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  for (const tNum of tableNumbers) {
    await db.query(
      'INSERT INTO tables (table_number) VALUES ($1) ON CONFLICT (table_number) DO NOTHING',
      [tNum]
    );
  }
  console.log(`[Seed] Seeded ${tableNumbers.length} active dining tables.`);
}
