import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = localStorage.getItem('@RocketShoes:cart');

    if (storageCart) {
      return JSON.parse(storageCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`/products/${productId}`);

      const productToStore: Product = {
        ...response.data,
        amount: 1,
      };

      const stockAmount = (await api.get(`/stock/${productId}`)).data.amount;

      const newCart = [...cart];
      const itemInCart = newCart.find(
        (item) => item.id === productToStore.id
      ) as Product;

      if (itemInCart?.id === productToStore.id) {
        const amount = itemInCart.amount + 1;

        if (amount > stockAmount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        itemInCart.amount = amount;
      } else {
        newCart.push(productToStore);
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const cartClone = [...cart];
      if (!cartClone.find((item) => item.id === productId)) {
        throw new Error('not found');
      }
      const newCart = cartClone.filter((item) => item.id !== productId);

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stockAmount = (await api.get(`/stock/${productId}`)).data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const cartClone = [...cart];
      if (!cartClone.find((item) => item.id === productId)) {
        throw new Error('not found');
      }

      const newCart = cartClone.map((item) => {
        if (item.id === productId) {
          return {
            ...item,
            amount,
          };
        }

        return item;
      });

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
