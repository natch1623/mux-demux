"""
Ejemplo resuelto: F(A, B, C) = Σm(1, 3, 6, 7) con un MUX 4:1.

  S1 = A, S0 = B  →  I0 = C, I1 = C, I2 = 0, I3 = 1

Compara el MUX con el circuito de compuertas (F = A'C + AB) en las 8
combinaciones, imprime la tabla de verdad y guarda dos capturas de respaldo:
  ../assets/simulacion/tabla.png   (la salida de la terminal)
  ../assets/simulacion/pulsos.png  (trenes de pulso A, B, C y F)

Uso:  python mux_funcion.py
"""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

SALIDA = Path(__file__).resolve().parent.parent / "assets" / "simulacion"
MINTERMINOS = {1, 3, 6, 7}


def mux4(i0, i1, i2, i3, s1, s0):
    """MUX 4:1: Y = S1'S0'I0 + S1'S0 I1 + S1 S0'I2 + S1 S0 I3"""
    n1, n0 = 1 - s1, 1 - s0
    return (n1 & n0 & i0) | (n1 & s0 & i1) | (s1 & n0 & i2) | (s1 & s0 & i3)


def f_mux(a, b, c):
    return mux4(c, c, 0, 1, a, b)          # I0 = C, I1 = C, I2 = 0, I3 = 1


def f_compuertas(a, b, c):
    return ((1 - a) & c) | (a & b)         # F = A'C + AB


def tabla():
    filas = []
    for m in range(8):
        a, b, c = (m >> 2) & 1, (m >> 1) & 1, m & 1
        filas.append((m, a, b, c, int(m in MINTERMINOS), f_compuertas(a, b, c), f_mux(a, b, c)))
    return filas


def texto_tabla(filas):
    entrada = ["I0 = C", "I0 = C", "I1 = C", "I1 = C", "I2 = 0", "I2 = 0", "I3 = 1", "I3 = 1"]
    lineas = [
        "$ python mux_funcion.py",
        "F(A,B,C) = Σm(1,3,6,7)  ·  MUX 4:1 con S1 = A, S0 = B",
        "",
        " m | A B C | F esperada | F compuertas | F MUX | entrada usada | ok",
        "---+-------+------------+--------------+-------+---------------+---",
    ]
    for (m, a, b, c, fe, fc, fm), e in zip(filas, entrada):
        ok = "✓" if fe == fc == fm else "✗"
        lineas.append(f" {m} | {a} {b} {c} |     {fe}      |      {fc}       |   {fm}   |    {e}     | {ok}")
    iguales = sum(fe == fc == fm for _, _, _, _, fe, fc, fm in filas)
    lineas += ["", f"Coinciden {iguales} de 8 combinaciones: el MUX reemplaza al circuito de compuertas."]
    return "\n".join(lineas)


def captura_tabla(texto):
    fig = plt.figure(figsize=(11, 3.75), dpi=150)
    fig.patch.set_facecolor("#0C0C0C")
    fig.text(0.02, 0.96, texto, family="monospace", fontsize=11.5, color="#E6E6E6", va="top", linespacing=1.45)
    fig.savefig(SALIDA / "tabla.png", facecolor=fig.get_facecolor())
    plt.close(fig)


def captura_pulsos(filas):
    # cada combinación dura una unidad de tiempo (contador de 3 bits: A es el bit más lento)
    t = list(range(9))
    def tren(col):
        v = [f[col] for f in filas]
        return v + [v[-1]]
    señales = [("A (S1)", tren(1), "#9FD4FF"), ("B (S0)", tren(2), "#9FD4FF"), ("C", tren(3), "#9FD4FF"),
               ("F compuertas", tren(5), "#4C8DFF"), ("F MUX", tren(6), "#FF4D4D")]
    fig, ejes = plt.subplots(len(señales) - 1, 1, figsize=(11, 5.6), dpi=150, sharex=True)
    fig.patch.set_facecolor("#0E1424")
    for ax in ejes:
        ax.set_facecolor("#0E1424")
        ax.set_ylim(-0.25, 1.35)
        ax.set_yticks([0, 1])
        ax.tick_params(colors="#B9C3D6", labelsize=9)
        for lado in ax.spines.values():
            lado.set_color("#3A4766")
        for k in range(9):
            ax.axvline(k, color="#25304A", lw=0.8, zorder=0)
    for ax, (nombre, v, color) in zip(ejes[:3], señales[:3]):
        ax.step(t, v, where="post", color=color, lw=2.2)
        ax.set_ylabel(nombre, color="#E6ECF7", rotation=0, ha="right", va="center", fontsize=10)
    ax = ejes[3]
    ax.step(t, señales[3][1], where="post", color=señales[3][2], lw=4.5, label="F compuertas (A'C + AB)")
    ax.step(t, señales[4][1], where="post", color=señales[4][2], lw=2, ls="--", label="F MUX 4:1")
    ax.set_ylabel("F", color="#E6ECF7", rotation=0, ha="right", va="center", fontsize=10)
    ax.legend(loc="upper center", bbox_to_anchor=(5 / 8, 0.98), fontsize=9, facecolor="#0E1424", edgecolor="#3A4766", labelcolor="#E6ECF7")
    ax.set_xticks([k + 0.5 for k in range(8)])
    ax.set_xticklabels([f"m{k}" for k in range(8)])
    ax.set_xlim(0, 8)
    fig.suptitle("Trenes de pulso · F(A,B,C) = Σm(1,3,6,7): el MUX coincide con la función en las 8 combinaciones",
                 color="#E6ECF7", fontsize=11.5)
    fig.tight_layout()
    fig.savefig(SALIDA / "pulsos.png", facecolor=fig.get_facecolor())
    plt.close(fig)


if __name__ == "__main__":
    SALIDA.mkdir(parents=True, exist_ok=True)
    filas = tabla()
    texto = texto_tabla(filas)
    print(texto)
    captura_tabla(texto)
    captura_pulsos(filas)
    assert all(fe == fc == fm for _, _, _, _, fe, fc, fm in filas)
    print(f"\nCapturas guardadas en {SALIDA}")
