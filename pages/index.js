import AsyncRetry from 'async-retry'
import axios from 'axios'
import { useState } from 'react'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import { readFileAsUrl } from '../utils/common'

export default function Home() {
  const [comicId, setComicId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [lang, setLang] = useState('')
  const [items, setItems] = useState([])

  const submit = async () => {
    const pageHash = []
    for (const [idx, item] of items.entries()) {
      await AsyncRetry(async () => {
        try {
          const formData = new FormData()
          formData.append('files', item.file)
          const resp = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload/single`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              authorization: process.env.NEXT_PUBLIC_AUTH_TOKEN,
            },
          })
          pageHash.push(resp.data.data)
          console.log(`uploaded ${(idx + 1) * 100 / items.length}%`)
        } catch (err) {
          console.log(err)
          throw new Error('Try again')
        }
      }, {
        retries: 50,
        minTimeout: 500,
        maxTimeout: 2500
      })
    }

    console.log(pageHash)

    await AsyncRetry(async () => {
      try {
        const params = {
          images: pageHash,
          lang: lang
        }
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/pages/${comicId}/${chapterId}`, params, {
          headers: {
            authorization: process.env.NEXT_PUBLIC_AUTH_TOKEN,
          },
        })
        console.log(`chapter uploaded!`)
      } catch (err) {
        console.log(err)
        throw new Error('Try again')
      }
    }, {
      retries: 50,
      minTimeout: 500,
      maxTimeout: 2500
    })
  }

  const addImages = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems = []
      for (const file of e.target.files) {
        const imgUrl = await readFileAsUrl(file)
        newItems.push({
          id: Math.ceil(Math.random() * 1000).toString() + Math.ceil(Math.random() * 1000).toString(),
          content: imgUrl,
          file: file
        })
      }
      const currentItems = [...items]
      setItems(currentItems.concat(newItems))
    }
  }

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  };

  const grid = 8;

  const getItemStyle = (isDragging, draggableStyle) => ({
    // some basic styles to make the items look a bit nicer
    userSelect: "none",
    padding: grid * 2,
    margin: `0 0 ${grid}px 0`,

    // change background colour if dragging
    background: isDragging ? "lightgreen" : "grey",

    // styles we need to apply on draggables
    ...draggableStyle
  });

  const getListStyle = isDraggingOver => ({
    background: isDraggingOver ? "lightblue" : "lightgrey",
    padding: grid,
    width: 250
  });

  const onDragEnd = (result) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const newItemsOrder = reorder(
      items,
      result.source.index,
      result.destination.index
    );

    setItems(newItemsOrder)

  }

  console.log(items)

  return (
    <div>
      <div>
        <label>Comic ID</label>
        <input value={comicId} onChange={e => setComicId(e.target.value)} />
      </div>
      <div>
        <label>Chapter ID</label>
        <input value={chapterId} onChange={e => setChapterId(e.target.value)} />
      </div>
      <div>
        <label>Lang</label>
        <input value={lang} onChange={e => setLang(e.target.value)} />
      </div>

      <div>
        <input onChange={addImages} type="file" multiple />
      </div>



      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={getListStyle(snapshot.isDraggingOver)}
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={getItemStyle(
                        snapshot.isDragging,
                        provided.draggableProps.style
                      )}
                    >
                      <img src={item.content} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div>
        <button onClick={submit}>Upload</button>
      </div>
    </div>
  )
}
