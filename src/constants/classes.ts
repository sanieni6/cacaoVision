export const CLASS_LABELS: Record<number, string> = {
  0: 'healthy',
  1: 'moniliasis',
  2: 'black_pod',
};

export const CLASS_LABELS_ES: Record<number, string> = {
  0: 'Saludable',
  1: 'Moniliasis',
  2: 'Mazorca Negra',
};

export const CLASS_COLORS: Record<string, string> = {
  healthy: '#2ECC71',
  moniliasis: '#F39C12',
  black_pod: '#E74C3C',
};

export const CLASS_DESCRIPTIONS_ES: Record<string, string> = {
  healthy: 'Mazorca de cacao en estado saludable',
  moniliasis: 'Pudrición helada causada por Moniliophthora roreri',
  black_pod: 'Mazorca negra causada por Phytophthora palmivora',
};

export const NUM_CLASSES = 3;
