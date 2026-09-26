export interface PetDefinition {
  id: string
  name: string
  image: string
  alt: string
}

/** Add future appearances here; the pet window does not depend on a specific asset. */
export const pets: PetDefinition[] = [
  {
    id: 'sprout-student',
    name: '小芽同学',
    image: './pets/sprout-student.png',
    alt: '穿绿色卫衣、戴圆框眼镜的小芽同学'
  }
]
