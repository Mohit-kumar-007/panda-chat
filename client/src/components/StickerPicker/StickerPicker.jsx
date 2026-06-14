import { motion, AnimatePresence } from 'framer-motion';

const STICKERS = ['🐼', '🌸', '💮', '🍜', '😂', '❤️'];

/**
 * StickerPicker — Horizontal sticker emoji picker
 * Appears above the message bubble on 800ms long press
 */
const StickerPicker = ({ onSelect, onClose, isOwn }) => {
  return (
    <AnimatePresence>
      <motion.div
        className="sticker-picker"
        style={{
          [isOwn ? 'right' : 'left']: 0,
          left: isOwn ? 'auto' : 0,
          right: isOwn ? 0 : 'auto',
        }}
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      >
        {STICKERS.map((sticker) => (
          <button
            key={sticker}
            onClick={() => onSelect(sticker)}
            className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 active:scale-90 transition-all"
            aria-label={`React with ${sticker}`}
          >
            {sticker}
          </button>
        ))}
        <button
          onClick={onClose}
          className="text-xs text-slate-400 ml-1 hover:text-slate-600 transition-colors"
          aria-label="Close sticker picker"
        >
          ✕
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default StickerPicker;
