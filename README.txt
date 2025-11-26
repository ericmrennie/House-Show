Welcome to DrawSynth! DrawSynth is a synthesizer that you play by drawing lines. Instead of traditional buttons or keys, the canvas itself becomes the instrument, 
turning your drawings into sound. The application features a palette of four colors, each linked to a type of soundwave. Red produces sine waves, orange produces 
triangle waves, yellow produces sawtooth waves, and blue produces square waves. You can also adjust the thickness of each line to control volume. The thicker the 
line, the louder the sound, and the thinner the line, the softer it will be. Playback speed is adjustable via a slider, giving the user control over how quickly 
the drawing is played back.

To get started with DrawSynth, first select a color, which determines the type of soundwave you want to use. Next, adjust the line thickness to set the desired volume. 
Finally, draw on the canvas using your mouse or trackpad. The vertical position of your lines determines pitch. Lines drawn higher on the canvas correspond to higher 
frequencies, while lower lines produce deeper sounds. The horizontal length of each line controls the duration of the sound, so longer lines will play longer. When 
you’re finished with your drawing, press the play button in the bottom right corner of the canvas to hear your creation. DrawSynth cycles through each line in the 
order they were drawn. If you want to start over, press the clear button to reset the canvas.

The inspiration for DrawSynth came from Eric Rosenbaum’s 'Singing Fingers' project. I wanted to create a project that tied drawing with music, and around the same time, 
I had been learning about the Fast Fourier Transform (FFT) algorithm and the process of converting images into sound. My initial idea was to develop a tool that would 
convert drawings into sound using FFT. However, FFT requires converting images to greyscale, which conflicted with my idea of using color to influence the sound. 
That’s when I decided to design an application where color determines the type of soundwave being played.

My development process began by referencing Jennifer Jacobs’ 'htmlUI' project, which provides a simple drawing tool with a color picker, stroke width slider, and stroke 
effect dropdown menu. I adapted this framework while adding my own logic to link color to wave type, map the y-position of lines to pitch, and use the x-length of lines 
to determine the duration of notes. With the help of an LLM, I then implemented playback functionality, using p5.js oscillators to turn line attributes such as color, 
thickness, and length into sound. One challenge I faced here was playing multiple sounds at the same x-coordinate but different y-coordinates. This would allow the user 
to play chords, but executing this functionality became too complex due to the need to start and stop multiple oscillators in sync, so I set that feature aside for future 
development.

Looking ahead, I also plan to introduce a fifth color that records a sample from the user, allowing users to incorporate their own sounds directly into their drawings. 
Overall, DrawSynth combines visual and auditory creativity, encouraging experimentation while exploring the relationship between color, form, and sound.
